import os
import sys

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Set test environment variables
os.environ.setdefault("JWT_SECRET_KEY", "super_secret_test_jwt_key_for_development_and_testing_32chars!")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
