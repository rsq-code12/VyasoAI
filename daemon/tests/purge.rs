#![cfg(test)]
use axum::Router;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use std::sync::{Arc, Mutex};
use reqwest::Client;

use vyasoai_daemon::{routes, state, storage::{db, blobs, hash}};
use vyasoai_daemon::handlers::{EventEnvelope, PrivacyFlag, PurgeRequest};

#[tokio::test]
async fn purge_deletes_events_and_blobs_when_refcount_zero() {
    let db_path = std::path::PathBuf::from("data/vyaso_test_purge.db");
    let conn = db::init_db(&db_path).unwrap();
    blobs::ensure_blob_base().unwrap();

    let (tx, rx) = mpsc::channel::<state::IngestJob>(64);
    let app_state = Arc::new(state::AppState { db: Arc::new(Mutex::new(conn)), queue_tx: tx.clone(), key_manager: None });
    vyasoai_daemon::queue::start_worker(rx, app_state.clone());
    let app: Router = routes::router(app_state.clone());

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap(); });

    let tmpdir = std::env::temp_dir();
    let data = b"purge me".to_vec();
    let path = tmpdir.join("vyaso_purge.txt");
    std::fs::write(&path, &data).unwrap();
    let hash_hex = hash::compute_sha256(&data);

    let mk_env = || EventEnvelope {
        event_id: uuid::Uuid::new_v4().to_string(),
        timestamp: time::OffsetDateTime::now_utc().format(&time::format_description::well_known::Rfc3339).unwrap(),
        source: "purger".to_string(),
        app: "purge-app".to_string(),
        content_pointer: path.to_string_lossy().to_string(),
        content_hash: hash_hex.clone(),
        size_bytes: data.len() as u64,
        tags: vec!["x".to_string()],
        privacy_flag: PrivacyFlag::Default,
    };

    let env1 = mk_env();
    let env2 = mk_env();
    let client = Client::new();
    let base = format!("http://{}", addr);
    let _ = client.post(format!("{}/v1/events", base)).header("X-Vyaso-Local-Client", "vscode").json(&env1).send().await.unwrap();
    let _ = client.post(format!("{}/v1/events", base)).header("X-Vyaso-Local-Client", "vscode").json(&env2).send().await.unwrap();
    tokio::time::sleep(std::time::Duration::from_millis(800)).await;

    let req = PurgeRequest { event_ids: Some(vec![env1.event_id.clone(), env2.event_id.clone()]), start: None, end: None, app: None, source: None, privacy_flag: None };
    let resp = client.post(format!("{}/v1/purge", base)).header("X-Vyaso-Local-Client", "vscode").json(&req).send().await.unwrap();
    assert!(resp.status().is_success());
    let v: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(v["deleted_events"].as_u64().unwrap(), 2);
    assert_eq!(v["deleted_blobs"].as_u64().unwrap(), 1);
}
