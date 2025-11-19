import os
from typing import Optional, Tuple

try:
    import keyring  # type: ignore
except Exception:
    keyring = None  # type: ignore


SERVICE = "vyaso"
INDEX_KEY_NAME = "index-key"


def get_index_key() -> Tuple[bytes, str]:
    env_key = os.getenv("VYASOAI_INDEX_KEY")
    if env_key:
        try:
            return bytes.fromhex(env_key), "env:VYASOAI_INDEX_KEY"
        except Exception:
            pass
    if keyring is not None:
        val = keyring.get_password(SERVICE, INDEX_KEY_NAME)
        if val:
            try:
                return bytes.fromhex(val), "keyring"
            except Exception:
                pass
    # generate dev key (non-durable) if none found
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        key = AESGCM.generate_key(bit_length=256)
    except Exception:
        key = os.urandom(32)
    return key, "generated"


def set_index_key(hex_key: str) -> bool:
    if keyring is None:
        return False
    try:
        keyring.set_password(SERVICE, INDEX_KEY_NAME, hex_key)
        return True
    except Exception:
        return False