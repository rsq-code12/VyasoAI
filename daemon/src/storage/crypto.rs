// src/crypto.rs
use crate::storage::Result;
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use rand::rngs::OsRng;
use rand::RngCore;
use sha2::{Digest, Sha256};

const NONCE_SIZE: usize = 12; // AES-GCM standard nonce size

/// Derive a 256-bit key from a passphrase in env var `VYASOAI_DEV_PASSPHRASE`.
/// In dev-mode, we hash the passphrase with SHA-256 to obtain a 32-byte key.
/// If not set, we use a fixed fallback key (NOT SECURE; for local dev only).
pub fn derive_key() -> [u8; 32] {
    let pass = std::env::var("VYASOAI_DEV_PASSPHRASE")
        .unwrap_or_else(|_| "vyasoai-dev-default-key".to_string());
    let mut hasher = Sha256::new();
    hasher.update(pass.as_bytes());
    let digest = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&digest[..32]);
    key
}

/// Encrypt bytes with AES-256-GCM.
/// We prepend the random 12-byte nonce to the ciphertext: [nonce || cipher].
pub fn encrypt_bytes(plain: &[u8]) -> Result<Vec<u8>> {
    // derive key bytes and create Key object
    let key_bytes = derive_key();
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    // generate nonce
    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // encrypt
    let ct = cipher
        .encrypt(nonce, plain)
        .map_err(|e| format!("encryption error: {}", e))?;

    // output = nonce || ciphertext
    let mut out = Vec::with_capacity(NONCE_SIZE + ct.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ct);
    Ok(out)
}

/// Decrypt bytes with AES-256-GCM. Input must be [nonce || cipher].
pub fn decrypt_bytes(cipher_input: &[u8]) -> Result<Vec<u8>> {
    if cipher_input.len() < NONCE_SIZE {
        return Err("cipher too short".into());
    }

    let (nonce_bytes, ct) = cipher_input.split_at(NONCE_SIZE);

    let key_bytes = derive_key();
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    let pt = cipher
        .decrypt(nonce, ct)
        .map_err(|e| format!("decryption error: {}", e))?;
    Ok(pt)
}

/// Recommendation: compress then encrypt.
/// - Compression removes redundancy and reduces size.
/// - Encryption after compression preserves security; encrypting first defeats compression.
pub const RECOMMENDED_ORDER: &str = "compress_then_encrypt";
