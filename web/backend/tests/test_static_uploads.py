import os
import uuid

from fastapi.testclient import TestClient

from app.main import app


def _make_uploaded_video() -> str:
    name = f"_pytest_{uuid.uuid4().hex}.mp4"
    path = os.path.join("uploads", name)
    with open(path, "wb") as f:
        f.write(b"0123456789" * 10)
    return name


def test_full_upload_response_is_cacheable():
    """Complete files can be cached forever; names are UUID-based."""
    name = _make_uploaded_video()
    try:
        res = TestClient(app).get(f"/uploads/{name}")

        assert res.status_code == 200
        assert res.headers["content-type"] == "video/mp4"
        assert res.headers["accept-ranges"] == "bytes"
        assert res.headers["cache-control"] == "public, max-age=31536000, immutable"
        assert res.headers["vercel-cache-tag"] == "uploads"
    finally:
        os.remove(os.path.join("uploads", name))


def test_partial_upload_response_is_never_cached():
    """A cached 206 would be served to clients that asked for the whole file."""
    name = _make_uploaded_video()
    try:
        res = TestClient(app).get(f"/uploads/{name}", headers={"Range": "bytes=0-9"})

        assert res.status_code == 206
        assert res.headers["content-range"] == "bytes 0-9/100"
        assert res.content == b"0123456789"
        assert res.headers["cache-control"] == "no-store"
        assert res.headers["vercel-cdn-cache-control"] == "no-store"
    finally:
        os.remove(os.path.join("uploads", name))
