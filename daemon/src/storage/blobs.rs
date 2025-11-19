use crate::storage::{Result};
use crate::storage::crypto::{encrypt_bytes, decrypt_bytes};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

/// Save a blob with zstd compression then AES-256-GCM encryption.
/// Path is deterministic based on current date and the provided `hash`.
/// Returns the filesystem path to the stored blob.
pub fn save_blob(content: &[u8], hash: &str) -> Result<PathBuf> {
    let now = time::OffsetDateTime::now_utc();
    let (y, m, d) = (now.year(), now.month() as u8, now.day());
    let dir = PathBuf::from(format!("data/blobs/{:04}/{:02}/{:02}", y, m, d));
    fs::create_dir_all(&dir)?;

    // Compress then encrypt
    let compressed = zstd::stream::encode_all(std::io::Cursor::new(content), 3)?; // level 3: good balance
    let cipher = encrypt_bytes(&compressed)?;

    let path = dir.join(format!("{}.zst.enc", hash));
    let mut f = fs::File::create(&path)?;
    f.write_all(&cipher)?;
    Ok(path)
}

/// Load a blob by reading, decrypting, then decompressing.
pub fn load_blob(path: &Path) -> Result<Vec<u8>> {
    let mut f = fs::File::open(path)?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf)?;
    let decrypted = decrypt_bytes(&buf)?;
    let decompressed = zstd::stream::decode_all(std::io::Cursor::new(&decrypted[..]))?;
    Ok(decompressed)
}

/// Helper to ensure base directories exist.
pub fn ensure_blob_base() -> Result<()> {
    fs::create_dir_all("data/blobs")?;
    Ok(())
}

/// Ensure today's dated directory exists under data/blobs/YYYY/MM/DD
pub fn ensure_today_blob_dir() -> Result<()> {
    let now = time::OffsetDateTime::now_utc();
    let (y, m, d) = (now.year(), now.month() as u8, now.day());
    let dir = PathBuf::from(format!("data/blobs/{:04}/{:02}/{:02}", y, m, d));
    fs::create_dir_all(&dir)?;
    Ok(())
}