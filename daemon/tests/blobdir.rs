#![cfg(test)]
use vyasoai_daemon::storage::blobs;

#[test]
fn ensure_today_blob_dir_creates_expected_path() {
    blobs::ensure_blob_base().unwrap();
    blobs::ensure_today_blob_dir().unwrap();
    let now = time::OffsetDateTime::now_utc();
    let dir = format!("data/blobs/{:04}/{:02}/{:02}", now.year(), now.month() as u8, now.day());
    assert!(std::path::Path::new(&dir).exists());
}