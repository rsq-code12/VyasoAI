use tokio::{sync::mpsc::Receiver, time::{Duration, Instant}};
use tracing::{info, error};
use std::path::PathBuf;

use crate::handlers::{EventEnvelope, PrivacyFlag};
use crate::storage::{db, blobs, Result as StorageResult};
use crate::state::AppState;
use std::sync::Arc;
use tokio::process::Command;
use serde_json::json;
use uuid::Uuid;

const BATCH_SIZE: usize = 64;
const FLUSH_INTERVAL_MS: u64 = 100;

pub fn start_worker(mut rx: Receiver<EventEnvelope>, state: Arc<AppState>) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mut buf: Vec<EventEnvelope> = Vec::with_capacity(BATCH_SIZE);
        let mut next_flush = Instant::now() + Duration::from_millis(FLUSH_INTERVAL_MS);
        loop {
            let timeout = next_flush.saturating_duration_since(Instant::now());
            let recv = tokio::time::timeout(timeout, rx.recv()).await;
            match recv {
                Ok(Some(ev)) => {
                    buf.push(ev);
                    if buf.len() >= BATCH_SIZE {
                        flush_batch(state.clone(), &mut buf).await;
                        next_flush = Instant::now() + Duration::from_millis(FLUSH_INTERVAL_MS);
                    }
                }
                Ok(None) => {
                    if !buf.is_empty() { flush_batch(state.clone(), &mut buf).await; }
                    break;
                }
                Err(_) => {
                    if !buf.is_empty() { flush_batch(state.clone(), &mut buf).await; }
                    next_flush = Instant::now() + Duration::from_millis(FLUSH_INTERVAL_MS);
                }
            }
        }
    })
}

async fn flush_batch(state: Arc<AppState>, buf: &mut Vec<EventEnvelope>) {
    if buf.is_empty() { return; }
    let events = std::mem::take(buf);
    let _ = tokio::task::spawn_blocking(move || {
        for ev in events {
            let res = process_event(state.clone(), ev);
            if let Err(e) = res { error!(%e); }
        }
        Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
    }).await;
}

fn process_event(state: Arc<AppState>, ev: EventEnvelope) -> StorageResult<()> {
    match ev.privacy_flag {
        PrivacyFlag::NeverStore => {
            {
                let conn = state.db.lock().unwrap();
                db::insert_event(&conn, &ev)?;
            }
            return Ok(());
        }
        _ => {}
    }
    let pointer = PathBuf::from(ev.content_pointer.clone());
    if pointer.exists() {
        let bytes = std::fs::read(&pointer)?;
        let _ = blobs::save_blob(&bytes, &ev.content_hash)?;
    }
    {
        let conn = state.db.lock().unwrap();
        db::insert_event(&conn, &ev)?;
    }
    // Intelligence handoff
    let job_id = Uuid::new_v4().to_string();
    let in_dir = PathBuf::from("data/intel/in");
    let out_dir = PathBuf::from("data/intel/out");
    let log_dir = PathBuf::from("data/intel/logs");
    std::fs::create_dir_all(&in_dir)?;
    std::fs::create_dir_all(&out_dir)?;
    std::fs::create_dir_all(&log_dir)?;

    // Resolve blob path from db (authoritative path)
    let blob_path = {
        let conn = state.db.lock().unwrap();
        match db::get_blob_index(&conn, &ev.content_hash)? { Some((p, _)) => p, None => ev.content_pointer.clone() }
    };
    let in_path = in_dir.join(format!("{}.json", job_id));
    let out_path = out_dir.join(format!("{}.json", job_id));
    let log_path = log_dir.join(format!("{}.log", job_id));
    let envelope = json!({
        "job_id": job_id,
        "event_id": ev.event_id,
        "blob_path": blob_path,
        "content_type": "prose",
        "source": ev.source,
        "params": {"backend": "mock"},
        "created_at": time::OffsetDateTime::now_utc().to_string()
    });
    std::fs::write(&in_path, serde_json::to_string(&envelope)?)?;

    // Spawn Python CLI subprocess with timeout and retries
    let max_retries = if cfg!(test) { 0usize } else { 3usize };
    let timeout_ms = if cfg!(test) { 100u64 } else { 15_000u64 };
    let mut attempt = 0usize;
    let mut success = false;
    while attempt < max_retries {
        attempt += 1;
        let mut cmd = Command::new("python3");
        cmd.arg("-m").arg("intelligence.cli").arg("process").arg(&ev.event_id)
            .arg("--job").arg(&job_id)
            .arg("--infile").arg(&in_path)
            .arg("--outfile").arg(&out_path)
            .kill_on_drop(true);
        let fut = cmd.output();
        let res = tokio::runtime::Handle::current().block_on(async {
            tokio::time::timeout(Duration::from_millis(timeout_ms), fut).await
        });
        match res {
            Ok(Ok(out)) => {
                if !out.stderr.is_empty() {
                    let _ = std::fs::write(&log_path, out.stderr);
                }
                if out.status.success() {
                    success = true;
                    break;
                } else {
                    // Non-zero exit; retry
                    info!(attempt, job_id, "intel subprocess failed; retrying");
                }
            }
            Ok(Err(e)) => {
                error!(%e, attempt, job_id, "intel subprocess spawn error");
            }
            Err(_) => {
                info!(attempt, job_id, "intel subprocess timed out");
            }
        }
    }

    if success {
        if let Ok(text) = std::fs::read_to_string(&out_path) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                if v.get("status").and_then(|s| s.as_str()) == Some("ok") {
                    if let (Some(event_id), Some(chunks_val)) = (v.get("event_id"), v.get("chunks")) {
                        let eid = event_id.as_str().unwrap_or("").to_string();
                        if let Some(arr) = chunks_val.as_array() {
                            let rows: Vec<crate::storage::db::ChunkRow> = arr.iter().filter_map(|c| {
                                Some(crate::storage::db::ChunkRow{
                                    chunk_id: c.get("id")?.as_str()?.to_string(),
                                    event_id: eid.clone(),
                                    start_offset: c.get("start")?.as_i64()?,
                                    end_offset: c.get("end")?.as_i64()?,
                                    content_type: c.get("type")?.as_str()?.to_string(),
                                })
                            }).collect();
                            {
                                let conn = state.db.lock().unwrap();
                                let _ = db::insert_chunks(&conn, &rows);
                            }
                        }
                    }
                }
            }
        }
    } else {
        error!(job_id, event_id=%ev.event_id, "intel processing failed; marking event as failed and continuing");
    }
    Ok(())
}