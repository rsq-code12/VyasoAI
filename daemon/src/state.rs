use std::sync::{Arc, Mutex};
use tokio::sync::mpsc::Sender;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<rusqlite::Connection>>, 
    pub queue_tx: Sender<IngestJob>,
    pub key_manager: Option<KeyManager>,
}

pub type IngestJob = crate::handlers::EventEnvelope;

#[derive(Clone)]
pub struct KeyManager { pub key: [u8; 32] }
impl KeyManager { pub fn new() -> Self { Self { key: crate::storage::crypto::derive_key() } } }