#![cfg(test)]
use axum::Router;
use reqwest::Client;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use std::sync::{Arc, Mutex};

use vyasoai_daemon::{routes, queue, storage::{db, hash, blobs}, state};
use vyasoai_daemon::handlers::{EventEnvelope, PrivacyFlag};

#[tokio::test]
async fn end_to_end_ingestion_creates_rows_and_blobs() {
    let db_path = std::path::PathBuf::from("data/vyaso.db");
    let conn = db::init_db(&db_path).unwrap();
    blobs::ensure_blob_base().unwrap();

    let (tx, rx) = mpsc::channel::<state::IngestJob>(64);
    let app_state = Arc::new(state::AppState { db: Arc::new(Mutex::new(conn)), queue_tx: tx.clone(), key_manager: Some(state::KeyManager::new()) });
    queue::start_worker(rx, app_state.clone());
    let app: Router = routes::router(app_state.clone());

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap(); });

    let tmpdir = std::env::temp_dir();
    let contents = vec![b"alpha".to_vec(), b"beta".to_vec(), b"gamma".to_vec()];
    let mut envelopes = Vec::new();
    for (i, c) in contents.iter().enumerate() {
        let path = tmpdir.join(format!("vyaso_integ_{}.txt", i));
        std::fs::write(&path, c).unwrap();
        let hash_hex = hash::compute_sha256(c);
        let env = EventEnvelope {
            event_id: uuid::Uuid::new_v4().to_string(),
            timestamp: time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap(),
            source: "integration-test".to_string(),
            app: "test-app".to_string(),
            content_pointer: path.to_string_lossy().to_string(),
            content_hash: hash_hex,
            size_bytes: c.len() as u64,
            tags: vec!["test".to_string()],
            privacy_flag: PrivacyFlag::Default,
        };
        envelopes.push(env);
    }

    let client = Client::new();
    for env in envelopes.iter() {
        let url = format!("http://{}/v1/events", addr);
        let resp = client.post(url).header("X-Vyaso-Local-Client", "vscode").json(env).send().await.unwrap();
        assert_eq!(resp.status(), reqwest::StatusCode::ACCEPTED);
    }

    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

    let count: i64 = app_state.db.lock().unwrap().query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0)).unwrap();
    assert!(count >= 3);

    for env in envelopes.iter() {
        let path = format!("data/blobs/{}/{:02}/{:02}/{}.zst.enc",
            time::OffsetDateTime::now_utc().year(),
            time::OffsetDateTime::now_utc().month() as u8,
            time::OffsetDateTime::now_utc().day(),
            env.content_hash);
        assert!(std::path::Path::new(&path).exists());
        let loaded = blobs::load_blob(std::path::Path::new(&path)).unwrap();
        let orig = std::fs::read(&env.content_pointer).unwrap();
        assert_eq!(loaded, orig);
    }
}