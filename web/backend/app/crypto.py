import json
import base64
import os
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

router = APIRouter(prefix="/crypto", tags=["crypto"])

KEYS_DIR = os.getenv("CRYPTO_KEYS_DIR", "keys")
PRIVATE_KEY_PATH = os.path.join(KEYS_DIR, "private_key.pem")
PUBLIC_KEY_PATH = os.path.join(KEYS_DIR, "public_key.pem")

def _load_or_generate_keys():
    """Load RSA keys from PEM files, generating them if they don't exist."""
    os.makedirs(KEYS_DIR, exist_ok=True)

    # Try to load existing private key
    if os.path.exists(PRIVATE_KEY_PATH):
        with open(PRIVATE_KEY_PATH, "rb") as f:
            private_key = serialization.load_pem_private_key(
                f.read(), password=None, backend=default_backend()
            )
    else:
        # Generate new key pair and persist
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        with open(PRIVATE_KEY_PATH, "wb") as f:
            f.write(private_pem)
        os.chmod(PRIVATE_KEY_PATH, 0o600)

    public_key = private_key.public_key()

    # Persist public key if missing
    if not os.path.exists(PUBLIC_KEY_PATH):
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        with open(PUBLIC_KEY_PATH, "wb") as f:
            f.write(public_pem)

    return private_key, public_key

# Load or generate keys at module import
private_key, public_key = _load_or_generate_keys()

public_key_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

@router.get("/public-key")
def get_public_key():
    return {"public_key": public_key_pem.decode('utf-8')}

def decrypt_payload(encrypted_key_b64: str, payload_b64: str) -> dict:
    try:
        # 1. Decrypt the AES key using RSA private key
        encrypted_aes_key = base64.b64decode(encrypted_key_b64)
        aes_key = private_key.decrypt(
            encrypted_aes_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        # 2. Decrypt the payload using AES-GCM
        # In this protocol, we expect the payload to be base64.
        # It contains the IV (first 12 bytes), Tag (last 16 bytes), and Ciphertext (middle)
        encrypted_payload_bytes = base64.b64decode(payload_b64)
        if len(encrypted_payload_bytes) < 28:
            raise ValueError("Invalid encrypted payload length")
            
        iv = encrypted_payload_bytes[:12]
        tag = encrypted_payload_bytes[-16:]
        ciphertext = encrypted_payload_bytes[12:-16]
        
        cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv, tag), backend=default_backend())
        decryptor = cipher.decryptor()
        
        decrypted_bytes = decryptor.update(ciphertext) + decryptor.finalize()
        decrypted_json = json.loads(decrypted_bytes.decode('utf-8'))
        
        return decrypted_json
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giải mã dữ liệu thất bại."
        )
