#![cfg(test)]
use axum::Router;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use std::sync::{Arc, Mutex};
use reqwest::Client;

use vyasoai_daemon::{routes, state, storage::{db, blobs}};
use vyasoai_daemon::handlers::{EventEnvelope, PrivacyFlag};

#[tokio::test]
async fn get_mem_returns_event_and_blob_metadata() {
    let db_path = std::path::PathBuf::from("data/vyaso_test_mem.db");
    let conn = db::init_db(&db_path).unwrap();
    blobs::ensure_blob_base().unwrap();

    let (tx, rx) = mpsc::channel::<state::IngestJob>(16);
    let app_state = Arc::new(state::AppState { db: Arc::new(Mutex::new(conn)), queue_tx: tx.clone(), key_manager: None });
    vyasoai_daemon::queue::start_worker(rx, app_state.clone());
    let app: Router = routes::router(app_state.clone());

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap(); });

    let tmp = std::env::temp_dir().join("vyaso_mem_test.txt");
    std::fs::write(&tmp, b"hello world").unwrap();
    let hash_hex = vyasoai_daemon::storage::hash::compute_sha256(&std::fs::read(&tmp).unwrap());
    let env = EventEnvelope {
        event_id: uuid::Uuid::new_v4().to_string(),
        timestamp: time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap(),
        source: "test-src".to_string(),
        app: "test-app".to_string(),
        content_pointer: tmp.to_string_lossy().to_string(),
        content_hash: hash_hex,
        size_bytes: 11,
        tags: vec!["t".to_string()],
        privacy_flag: PrivacyFlag::Default,
    };
    let client = Client::new();
    let base = format!("http://{}", addr);
    let _ = client.post(format!("{}/v1/events", base)).header("X-Vyaso-Local-Client", "vscode").json(&env).send().await.unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    let resp = client.get(format!("{}/v1/mem/{}", base, env.event_id)).header("X-Vyaso-Local-Client", "vscode").send().await.unwrap();
    assert!(resp.status().is_success());
    let v: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(v["event"]["event_id"], env.event_id);
    assert!(v["blob"].is_object());
}

#[tokio::test]
async fn get_mem_404_for_missing() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    let (tx, _rx) = mpsc::channel::<state::IngestJob>(16);
    let app_state = Arc::new(state::AppState { db: Arc::new(Mutex::new(conn)), queue_tx: tx.clone(), key_manager: None });
    let app: Router = routes::router(app_state.clone());

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap(); });
    let resp = Client::new().get(format!("http://{}/v1/mem/{}", addr, uuid::Uuid::new_v4())).header("X-Vyaso-Local-Client", "vscode").send().await.unwrap();
    assert_eq!(resp.status(), reqwest::StatusCode::NOT_FOUND);
}
