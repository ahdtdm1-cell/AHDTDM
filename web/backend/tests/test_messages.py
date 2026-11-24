import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app.models import User, Conversation, ConversationParticipant, Message
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

    u1 = User(username="alice", hashed_password=get_password_hash("Password123!"), display_name="Alice")
    u2 = User(username="bob", hashed_password=get_password_hash("Password123!"), display_name="Bob")
    u3 = User(username="charlie", hashed_password=get_password_hash("Password123!"), display_name="Charlie")
    db.add_all([u1, u2, u3])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    db.refresh(u3)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield db, u1, u2, u3
    app.dependency_overrides.clear()
    db.close()

def test_direct_messaging_flow(test_db):
    db, u1, u2, u3 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})
    token3 = create_access_token(data={"sub": u3.username, "user_id": u3.id})

    # 1. Alice creates or gets direct conversation with Bob
    conv_res = client.post(
        f"/api/conversations/direct/{u2.id}",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert conv_res.status_code in (200, 201)
    conv_id = conv_res.json()["id"]

    # 2. Alice sends message to Bob
    send_res = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "Hey Bob, how are you?", "message_type": "text"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert send_res.status_code == 201
    msg_data = send_res.json()
    assert msg_data["content"] == "Hey Bob, how are you?"
    msg_id = msg_data["id"]

    # 3. Bob retrieves messages from conversation
    msgs_res = client.get(
        f"/api/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert msgs_res.status_code == 200
    messages = msgs_res.json()
    assert len(messages) == 1
    assert messages[0]["content"] == "Hey Bob, how are you?"

    # 4. Charlie attempts to read conversation between Alice & Bob -> must be 403 Forbidden!
    unauth_res = client.get(
        f"/api/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {token3}"}
    )
    assert unauth_res.status_code == 403

    # 5. Alice unsends her message
    unsend_res = client.put(
        f"/api/messages/{msg_id}/unsend",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert unsend_res.status_code == 200
    assert unsend_res.json()["is_unsent"] is True

    # 6. Bob reacts to message with ❤️
    react_res = client.post(
        f"/api/messages/{msg_id}/react",
        json={"emoji": "❤️"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert react_res.status_code == 200
    assert react_res.json()["emoji"] == "❤️"


def test_conversation_list_reports_unread_counts(test_db):
    db, u1, u2, u3 = test_db
    client = TestClient(app)
    alice = {"Authorization": f"Bearer {create_access_token(data={'sub': u1.username, 'user_id': u1.id})}"}
    bob = {"Authorization": f"Bearer {create_access_token(data={'sub': u2.username, 'user_id': u2.id})}"}

    conv_id = client.post(f"/api/conversations/direct/{u2.id}", headers=alice).json()["id"]

    for text in ("Tin nhắn một", "Tin nhắn hai"):
        send_res = client.post(
            f"/api/conversations/{conv_id}/messages",
            json={"content": text, "message_type": "text"},
            headers=alice
        )
        assert send_res.status_code == 201

    # Bob has 2 unread messages; Alice never counts her own messages as unread.
    bob_convs = client.get("/api/conversations", headers=bob)
    assert bob_convs.status_code == 200
    bob_by_id = {conv["id"]: conv for conv in bob_convs.json()}
    assert bob_by_id[conv_id]["unread_count"] == 2

    alice_convs = client.get("/api/conversations", headers=alice)
    assert alice_convs.status_code == 200
    alice_by_id = {conv["id"]: conv for conv in alice_convs.json()}
    assert alice_by_id[conv_id]["unread_count"] == 0

    # Opening the conversation moves the read marker, clearing the unread count.
    assert client.get(f"/api/conversations/{conv_id}/messages", headers=bob).status_code == 200
    bob_after = {conv["id"]: conv for conv in client.get("/api/conversations", headers=bob).json()}
    assert bob_after[conv_id]["unread_count"] == 0

    # A recalled message must not count as unread.
    third = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "Tin nhắn ba", "message_type": "text"},
        headers=alice
    )
    assert third.status_code == 201
    assert client.put(f"/api/messages/{third.json()['id']}/unsend", headers=alice).status_code == 200

    bob_after_unsend = {conv["id"]: conv for conv in client.get("/api/conversations", headers=bob).json()}
    assert bob_after_unsend[conv_id]["unread_count"] == 0
