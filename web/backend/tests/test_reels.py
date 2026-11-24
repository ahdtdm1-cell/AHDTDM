import pytest
from io import BytesIO
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app.models import User, Reel, ReelComment, Friendship
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

def create_video_file(content=b"fake video content", filename="test.mp4"):
    """Create a fake video file for upload testing."""
    return BytesIO(content), filename


def test_create_and_read_reel(test_db):
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})

    # 1. Create reel - content from form is used, but server generates video URL
    video_file, filename = create_video_file()
    res = client.post(
        "/api/reels",
        files={"file": (filename, video_file, "video/mp4")},
        data={"content": "/uploads/reels/test.mp4", "privacy": "public"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    reel_data = res.json()
    # Server generates video URL with UUID
    assert reel_data["content"].startswith("/uploads/reels/")
    assert reel_data["author"]["username"] == "alice"
    reel_id = reel_data["id"]

    # 2. Read feed
    feed_res = client.get("/api/reels")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert len(feed) >= 1
    assert feed[0]["id"] == reel_id

def test_react_and_comment_on_reel(test_db):
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    # Alice creates reel
    video_file, filename = create_video_file()
    create_res = client.post(
        "/api/reels",
        files={"file": (filename, video_file, "video/mp4")},
        data={"content": "test_video.mp4", "privacy": "public"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert create_res.status_code == 201, f"Failed to create reel: {create_res.text}"
    reel_id = create_res.json()["id"]

    # Bob reacts with 'love'
    react_res = client.post(
        f"/api/reels/{reel_id}/react",
        json={"reaction_type": "love"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert react_res.status_code == 200
    react_data = react_res.json()
    assert react_data["user_reaction"] == "love"
    assert react_data["likes_count"] == 1
    assert react_data["reel_id"] == reel_id

    # Bob comments
    comment_res = client.post(
        f"/api/reels/{reel_id}/comments",
        json={"content": "Amazing reel!"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert comment_res.status_code == 201
    assert comment_res.json()["content"] == "Amazing reel!"
    assert comment_res.json()["author"]["username"] == "bob"

def test_reel_expiration(test_db):
    """Test that expired reels are not shown in feed."""
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})

    from datetime import datetime, timezone, timedelta

    # Create a reel that expires in 1 hour
    video_file, filename = create_video_file()
    res = client.post(
        "/api/reels",
        files={"file": (filename, video_file, "video/mp4")},
        data={"content": "test_video.mp4", "privacy": "public"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert res.status_code == 201

    # Manually expire the reel for testing
    reel = db.query(Reel).filter(Reel.author_id == u1.id).first()
    reel.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()

    # Feed should not contain expired reel
    feed_res = client.get("/api/reels")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    # Expired reel should not appear
    feed_ids = [r["id"] for r in feed]
    assert reel.id not in feed_ids

def test_idor_protection_on_reel_comment(test_db):
    """Test that users can only comment on reels they have access to."""
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    # Alice creates a private reel
    video_file, filename = create_video_file()
    create_res = client.post(
        "/api/reels",
        files={"file": (filename, video_file, "video/mp4")},
        data={"content": "private_video.mp4", "privacy": "private"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert create_res.status_code == 201
    reel_id = create_res.json()["id"]

    # Bob cannot view the private reel
    view_res = client.get(f"/api/reels/{reel_id}", headers={"Authorization": f"Bearer {token2}"})
    assert view_res.status_code == 403

    # Bob cannot comment on the private reel
    comment_res = client.post(
        f"/api/reels/{reel_id}/comments",
        json={"content": "Nice reel!"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert comment_res.status_code == 403

def test_delete_reel_comment(test_db):
    """Test deleting comments on reels."""
    db, u1, u2 = test_db
    client = TestClient(app)
    token1 = create_access_token(data={"sub": u1.username, "user_id": u1.id})
    token2 = create_access_token(data={"sub": u2.username, "user_id": u2.id})

    from app.models import ReelComment as RC

    # Alice creates reel
    video_file, filename = create_video_file()
    create_res = client.post(
        "/api/reels",
        files={"file": (filename, video_file, "video/mp4")},
        data={"content": "test_video.mp4", "privacy": "public"},
        headers={"Authorization": f"Bearer {token1}"}
    )
    reel_id = create_res.json()["id"]

    # Bob comments
    comment_res = client.post(
        f"/api/reels/{reel_id}/comments",
        json={"content": "Comment to delete"},
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert comment_res.status_code == 201
    comment_id = comment_res.json()["id"]

    # Bob deletes his own comment
    del_res = client.delete(
        f"/api/reels/comments/{comment_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert del_res.status_code == 200

    # Comment should no longer exist
    deleted_comment = db.query(RC).filter(RC.id == comment_id).first()
    assert deleted_comment is None