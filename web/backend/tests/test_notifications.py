import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User, Notification
from app.security import get_password_hash, create_access_token


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    users = [
        User(username="alice", hashed_password=get_password_hash("Password123!"), display_name="Alice"),
        User(username="bob", hashed_password=get_password_hash("Password123!"), display_name="Bob"),
        User(username="carol", hashed_password=get_password_hash("Password123!"), display_name="Carol"),
    ]
    db.add_all(users)
    db.commit()
    for user in users:
        db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield db, users
    app.dependency_overrides.clear()
    db.close()


def auth_headers(user: User) -> dict:
    token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return {"Authorization": f"Bearer {token}"}


def add_notification(db, recipient_id, actor_id, *, content, is_read=False, type="friend_request"):
    notif = Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=type,
        reference_id=1,
        content=content,
        is_read=is_read,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def test_list_filters_read_actions_and_cleanup(test_db):
    db, (alice, bob, _) = test_db
    client = TestClient(app)
    headers = auth_headers(alice)

    unread = add_notification(db, alice.id, bob.id, content="Lời mời kết bạn")
    read = add_notification(db, alice.id, bob.id, content="Đã chấp nhận", is_read=True)

    res = client.get("/api/notifications", headers=headers)
    assert res.status_code == 200
    assert {n["id"] for n in res.json()} == {unread.id, read.id}

    res = client.get("/api/notifications?unread_only=true", headers=headers)
    assert res.status_code == 200
    assert [n["id"] for n in res.json()] == [unread.id]

    res = client.put(f"/api/notifications/{unread.id}/read", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_read"] is True

    res = client.get("/api/notifications/unread-count", headers=headers)
    assert res.json()["unread_count"] == 0

    # read-all only touches the current user's unread rows
    fresh = add_notification(db, alice.id, bob.id, content="Cảm xúc về bài viết")
    other = add_notification(db, bob.id, alice.id, content="Của Bob")
    res = client.put("/api/notifications/read-all", headers=headers)
    assert res.status_code == 200
    assert res.json()["updated"] == 1
    db.refresh(fresh)
    db.refresh(other)
    assert fresh.is_read is True
    assert other.is_read is False

    # single delete is scoped to the owner
    res = client.delete(f"/api/notifications/{unread.id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["deleted"] == 1

    # clearing read notifications removes only read rows for this user
    res = client.delete("/api/notifications?read_only=true", headers=headers)
    assert res.status_code == 200
    assert res.json()["deleted"] == 2  # read + fresh

    remaining = client.get("/api/notifications", headers=headers).json()
    assert remaining == []
    assert db.query(Notification).filter(Notification.id == other.id).first() is not None


def test_cannot_delete_someone_elses_notification(test_db):
    db, (alice, bob, _) = test_db
    client = TestClient(app)

    notif = add_notification(db, bob.id, alice.id, content="Riêng của Bob")

    res = client.delete(f"/api/notifications/{notif.id}", headers=auth_headers(alice))
    assert res.status_code == 404
    assert db.query(Notification).filter(Notification.id == notif.id).first() is not None


def test_offline_message_notification_is_deduped_and_cleared_by_reading(test_db):
    db, (alice, bob, _) = test_db
    client = TestClient(app)
    alice_headers = auth_headers(alice)
    bob_headers = auth_headers(bob)

    conv_res = client.post(f"/api/conversations/direct/{bob.id}", headers=alice_headers)
    assert conv_res.status_code == 200
    conversation_id = conv_res.json()["id"]

    msg_res = client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "Chào Bob", "message_type": "text"},
        headers=alice_headers,
    )
    assert msg_res.status_code == 201

    notifs = db.query(Notification).filter(
        Notification.recipient_id == bob.id,
        Notification.type == "message",
    ).all()
    assert len(notifs) == 1
    assert notifs[0].reference_id == conversation_id
    assert notifs[0].is_read is False

    # Bob reads the conversation -> the message notification is cleared.
    res = client.get(f"/api/conversations/{conversation_id}/messages", headers=bob_headers)
    assert res.status_code == 200
    db.refresh(notifs[0])
    assert notifs[0].is_read is True

    # A second message within the dedupe window re-surfaces the same row
    # instead of creating a duplicate notification.
    msg_res = client.post(
        f"/api/conversations/{conversation_id}/messages",
        json={"content": "Bob ơi?", "message_type": "text"},
        headers=alice_headers,
    )
    assert msg_res.status_code == 201

    notifs = db.query(Notification).filter(
        Notification.recipient_id == bob.id,
        Notification.type == "message",
    ).all()
    assert len(notifs) == 1
    db.refresh(notifs[0])
    assert notifs[0].is_read is False

    unread = client.get("/api/notifications/unread-count", headers=bob_headers).json()
    assert unread["unread_count"] == 1
