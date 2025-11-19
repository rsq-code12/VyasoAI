import os
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
try:
    from intelligence.keyring.interface import get_index_key, set_index_key
except Exception:
    get_index_key = None  # type: ignore
    set_index_key = None  # type: ignore

def get_or_create_key() -> Tuple[bytes, str]:
    if get_index_key is not None:
        key, info = get_index_key()
        return key, info
    env_key = os.getenv("VYASOAI_INDEX_KEY")
    if env_key:
        try:
            return bytes.fromhex(env_key), "env:VYASOAI_INDEX_KEY"
        except Exception:
            pass
    key = AESGCM.generate_key(bit_length=256)
    return key, "generated"

def encrypt_bytes(key: bytes, plain: bytes) -> bytes:
    nonce = secrets.token_bytes(12)
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plain, None)
    return nonce + ct

def decrypt_bytes(key: bytes, cipher: bytes) -> bytes:
    nonce = cipher[:12]
    ct = cipher[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None)