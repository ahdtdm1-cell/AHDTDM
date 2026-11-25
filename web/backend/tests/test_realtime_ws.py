import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.websocket_manager import manager, PRESENCE_TTL_SECONDS
from app.security import create_access_token, get_password_hash
from app.database import Base, get_db
from app.models import User, Friendship
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def ws_client():
    return TestClient(app)


@pytest.fixture
def social_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    u1 = User(username="friend_a", hashed_password=get_password_hash("Password123!"), display_name="Friend A")
    u2 = User(username="friend_b", hashed_password=get_password_hash("Password123!"), display_name="Friend B")
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    db.add(Friendship(user_id=u1.id, friend_id=u2.id, status="accepted"))
    db.commit()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    manager.active_connections.clear()
    manager.http_heartbeats.clear()
    yield db, u1, u2
    manager.active_connections.clear()
    manager.http_heartbeats.clear()
    app.dependency_overrides.clear()
    db.close()


def test_websocket_manager_unit():
    # Test connection manager data structures and presence checks
    assert manager.is_user_online(99999) is False
    assert manager.get_online_user_ids() == []


def test_websocket_auth_and_messaging():
    # Generate token for a test user
    token = create_access_token(data={"sub": "ws_tester", "user_id": 101})
    client = TestClient(app)

    with client.websocket_connect(f"/api/ws?token={token}") as ws:
        # Initial presence handshake message
        msg = ws.receive_json()
        assert msg["type"] == "connected"
        assert msg["user_id"] == 101

        # Test ping/pong
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"


def test_two_friends_online_via_heartbeat_and_logout(social_db):
    _, u1, u2 = social_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id, "token_version": u1.token_version})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id, "token_version": u2.token_version})
    h1 = {"Authorization": f"Bearer {token1}"}
    h2 = {"Authorization": f"Bearer {token2}"}

    # Both send presence heartbeat (simulating Vercel/no-WS environment)
    hb1 = client.post("/api/users/me/heartbeat", headers=h1)
    hb2 = client.post("/api/users/me/heartbeat", headers=h2)
    assert hb1.status_code == 200
    assert hb2.status_code == 200
    assert u1.id in hb2.json()["online_user_ids"]
    assert u2.id in hb2.json()["online_user_ids"]

    # Both see each other online in friends list and user search/profile
    f1 = client.get("/api/friends/list", headers=h1).json()
    f2 = client.get("/api/friends/list", headers=h2).json()
    assert f1[0]["is_online"] is True
    assert f2[0]["is_online"] is True

    search_res = client.get("/api/users?search=friend_b", headers=h1).json()
    assert len(search_res) == 1
    assert search_res[0]["is_online"] is True

    # Expired heartbeat marks user offline
    manager.http_heartbeats[u2.id] = time.monotonic() - (PRESENCE_TTL_SECONDS + 5)
    f1_after_expire = client.get("/api/friends/list", headers=h1).json()
    assert f1_after_expire[0]["is_online"] is False

    # Re-heartbeat brings u2 back online, logout immediately marks u2 offline
    client.post("/api/users/me/heartbeat", headers=h2)
    assert client.get("/api/friends/list", headers=h1).json()[0]["is_online"] is True

    logout_res = client.post("/api/v1/auth/logout", headers=h2)
    assert logout_res.status_code == 200
    assert client.get("/api/friends/list", headers=h1).json()[0]["is_online"] is False


def test_two_friends_online_over_websocket_and_friend_accept_event(social_db):
    db, u1, u2 = social_db
    # Reset friendship to pending to test live accept broadcast
    db.query(Friendship).delete()
    db.commit()

    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    with client.websocket_connect(f"/api/ws?token={token1}") as ws1:
        connected1 = ws1.receive_json()
        assert connected1["type"] == "connected"
        assert u1.id in connected1["online_users"]

        with client.websocket_connect(f"/api/ws?token={token2}") as ws2:
            connected2 = ws2.receive_json()
            assert connected2["type"] == "connected"
            assert u1.id in connected2["online_users"]
            assert u2.id in connected2["online_users"]

            # ws1 receives presence_update for u2 coming online
            presence_msg = ws1.receive_json()
            assert presence_msg == {"type": "presence_update", "user_id": u2.id, "is_online": True}

            # u1 sends friend request and u2 accepts -> both receive friends_updated
            req_res = client.post(f"/api/friends/request/{u2.id}", headers={"Authorization": f"Bearer {token1}"})
            assert req_res.status_code == 201
            req_id = req_res.json()["id"]
            notif_req = ws2.receive_json()
            assert notif_req["type"] == "notification"

            acc_res = client.post(f"/api/friends/accept/{req_id}", headers={"Authorization": f"Bearer {token2}"})
            assert acc_res.status_code == 200

            # ws1 receives notification + friends_updated; ws2 receives friends_updated
            events_ws1 = [ws1.receive_json(), ws1.receive_json()]
            assert any(e["type"] == "friends_updated" for e in events_ws1)
            event_ws2 = ws2.receive_json()
            assert event_ws2["type"] == "friends_updated"

            # Both see each other online in friends list
            f1 = client.get("/api/friends/list", headers={"Authorization": f"Bearer {token1}"}).json()
            f2 = client.get("/api/friends/list", headers={"Authorization": f"Bearer {token2}"}).json()
            assert f1[0]["is_online"] is True
            assert f2[0]["is_online"] is True
