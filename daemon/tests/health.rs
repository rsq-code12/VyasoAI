#![cfg(test)]
use reqwest::Client;
use tokio::sync::mpsc;
use std::sync::{Arc, Mutex};
use axum::Router;
use tokio::net::TcpListener;

use vyasoai_daemon::{routes, state};

#[tokio::test]
async fn health_endpoint_returns_ok() {
    // Build app with a small queue
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    let (tx, _rx) = mpsc::channel::<state::IngestJob>(16);
    let app_state = Arc::new(state::AppState { db: Arc::new(Mutex::new(conn)), queue_tx: tx.clone(), key_manager: None });
    let app: Router = routes::router(app_state.clone());

    // Bind to an ephemeral TCP port on loopback for test purposes
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    // Spawn the server
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    // Hit the health endpoint
    let url = format!("http://{}/v1/health", addr);
    let resp = Client::new().get(url).send().await.unwrap();
    assert!(resp.status().is_success());
    let v: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(v["status"], "ok");
}