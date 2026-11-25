import os

from app.main import CachedStaticFiles


def _get_file_response(path: str):
    static = CachedStaticFiles(directory=os.path.dirname(path))
    scope = {
        "type": "http",
        "method": "GET",
        "headers": [],
        "path": "/" + os.path.basename(path),
        "query_string": b"",
        "root_path": "",
        "scheme": "http",
        "server": ("test", 80),
        "client": ("test", 1),
        "http_version": "1.1",
    }
    return static.file_response(path, os.stat(path), scope)


def test_uploaded_video_is_cached_and_seekable(tmp_path):
    """Videos must support Range requests and long-lived browser caching."""
    video = tmp_path / "clip.mp4"
    video.write_bytes(b"0123456789")

    response = _get_file_response(str(video))

    assert response.headers["content-type"] == "video/mp4"
    assert response.headers["accept-ranges"] == "bytes"
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
