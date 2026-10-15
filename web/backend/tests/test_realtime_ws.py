import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.websocket_manager import manager
from app.security import create_access_token
from app.database import Base, get_db
from app.models import User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def ws_client():
    return TestClient(app)

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
