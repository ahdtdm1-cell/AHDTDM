import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app.models import User, Friendship, Notification
from app.security import get_password_hash, create_access_token
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    u1 = User(username="user1", hashed_password=get_password_hash("Password123!"), display_name="User One")
    u2 = User(username="user2", hashed_password=get_password_hash("Password123!"), display_name="User Two")
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield db, u1, u2
    app.dependency_overrides.clear()
    db.close()

def test_friend_request_flow_and_notifications(test_db):
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    # 1. User 1 sends friend request to User 2
    req_res = client.post(
        f"/api/friends/request/{u2.id}",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert req_res.status_code == 201
    friendship_id = req_res.json()["id"]

    # 2. User 2 checks notifications and incoming friend requests
    notif_res = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert len(notifs) >= 1
    assert notifs[0]["type"] == "friend_request"
    assert notifs[0]["actor_id"] == u1.id

    requests_res = client.get(
        "/api/friends/requests",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert requests_res.status_code == 200
    requests = requests_res.json()
    assert len(requests) == 1
    assert requests[0]["user_id"] == u1.id

    # 3. User 2 accepts friend request
    accept_res = client.post(
        f"/api/friends/accept/{friendship_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "accepted"

    # 4. Both see each other in their friends list
    f_list1 = client.get("/api/friends/list", headers={"Authorization": f"Bearer {token1}"})
    f_list2 = client.get("/api/friends/list", headers={"Authorization": f"Bearer {token2}"})
    assert f_list1.status_code == 200
    assert f_list2.status_code == 200
    assert len(f_list1.json()) == 1
    assert len(f_list2.json()) == 1
    assert f_list1.json()[0]["username"] == "user2"
    assert f_list2.json()[0]["username"] == "user1"

    # 5. Mark notification as read
    notif_id = notifs[0]["id"]
    read_res = client.put(
        f"/api/notifications/{notif_id}/read",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
