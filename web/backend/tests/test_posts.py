import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app.models import User, Post, PostReaction, PostComment
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

    # Create 2 users
    u1 = User(username="alice", hashed_password=get_password_hash("Password123!"), display_name="Alice Smith")
    u2 = User(username="bob", hashed_password=get_password_hash("Password123!"), display_name="Bob Jones")
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

def test_create_and_read_post(test_db):
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})

    # 1. Create post
    res = client.post(
        "/api/posts",
        json={"content": "Hello World from Alice!", "privacy": "public", "media_urls": ["/uploads/photo1.jpg"]},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert res.status_code == 201
    post_data = res.json()
    assert post_data["content"] == "Hello World from Alice!"
    assert post_data["author"]["username"] == "alice"
    post_id = post_data["id"]

    # 2. Read feed
    feed_res = client.get("/api/posts")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert len(feed) >= 1
    assert feed[0]["id"] == post_id

def test_react_and_comment_on_post(test_db):
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    # Alice creates post
    create_res = client.post(
        "/api/posts",
        json={"content": "Post to react", "privacy": "public"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    post_id = create_res.json()["id"]

    # Bob reacts with 'love'
    react_res = client.post(
        f"/api/posts/{post_id}/react",
        json={"reaction_type": "love"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert react_res.status_code == 200
    assert react_res.json()["user_reaction"] == "love"
    assert react_res.json()["likes_count"] == 1

    # Bob comments
    comment_res = client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "Awesome post!"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert comment_res.status_code == 201
    assert comment_res.json()["content"] == "Awesome post!"
    assert comment_res.json()["author"]["username"] == "bob"

def test_idor_protection_on_post_delete(test_db):
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    # Alice creates post
    create_res = client.post(
        "/api/posts",
        json={"content": "Alice's private post", "privacy": "public"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    post_id = create_res.json()["id"]

    # Bob attempts to delete Alice's post -> must be 403 Forbidden!
    del_res = client.delete(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert del_res.status_code == 403

    # Alice deletes her own post -> 200 OK
    del_alice = client.delete(
        f"/api/posts/{post_id}",
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert del_alice.status_code == 200
