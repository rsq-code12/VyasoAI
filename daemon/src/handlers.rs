use axum::{extract::State, http::{StatusCode, HeaderMap}, Json};
use axum::extract::Path;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::{Uuid, Version};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrivacyFlag {
    #[serde(alias = "default")]
    Default,
    #[serde(alias = "sensitive")]
    Sensitive,
    #[serde(alias = "never_store")]
    NeverStore,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub event_id: String,
    pub timestamp: String, // RFC3339; validated
    pub source: String,
    pub app: String,
    pub content_pointer: String,
    pub content_hash: String, // sha256 hex
    pub size_bytes: u64,
    pub tags: Vec<String>,
    pub privacy_flag: PrivacyFlag,
}

impl EventEnvelope {
    pub fn validate(&self) -> Result<(), String> {
        // event_id must be UUID v4
        match Uuid::parse_str(&self.event_id) {
            Ok(u) if u.get_version() == Some(Version::Random) => {}
            Ok(_) => return Err("event_id must be uuid v4".to_string()),
            Err(_) => return Err("event_id must be a valid uuid".to_string()),
        }
        // timestamp must be RFC3339
        if time::OffsetDateTime::parse(&self.timestamp, &time::format_description::well_known::Rfc3339).is_err() {
            return Err("timestamp must be RFC3339".to_string());
        }
        // source/app non-empty
        if self.source.trim().is_empty() { return Err("source must be non-empty".to_string()); }
        if self.app.trim().is_empty() { return Err("app must be non-empty".to_string()); }
        // content_hash: 64 hex chars
        if self.content_hash.len() != 64 || !self.content_hash.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err("content_hash must be 64 hex characters (sha256)".to_string());
        }
        // content_pointer is placeholder; allow empty for now but keep sane
        if self.content_pointer.len() > 4096 { return Err("content_pointer too long".to_string()); }
        // size_bytes is u64; implicit non-negative
        Ok(())
    }
}

pub async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

pub async fn post_event(
    State(app): State<std::sync::Arc<crate::state::AppState>>,
    headers: HeaderMap,
    Json(envelope): Json<EventEnvelope>,
) -> (StatusCode, Json<Value>) {
    if let Err((code, body)) = validate_client(&headers) { return (code, body); }
    if let Err(e) = envelope.validate() {
        return (StatusCode::BAD_REQUEST, Json(json!({ "error": e })));
    }
    match app.queue_tx.send(envelope).await {
        Ok(()) => (StatusCode::ACCEPTED, Json(json!({ "queued": true })) ),
        Err(e) => (StatusCode::SERVICE_UNAVAILABLE, Json(json!({ "queued": false, "error": e.to_string() })) ),
    }
}

#[derive(Deserialize, Serialize)]
pub struct PurgeRequest {
    pub event_ids: Option<Vec<String>>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub app: Option<String>,
    pub source: Option<String>,
    pub privacy_flag: Option<PrivacyFlag>,
}

pub async fn get_mem(
    State(app): State<std::sync::Arc<crate::state::AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> (StatusCode, Json<Value>) {
    if let Err((code, body)) = validate_client(&headers) { return (code, body); }
    match uuid::Uuid::parse_str(&id) {
        Ok(u) if u.get_version() == Some(uuid::Version::Random) => {}
        _ => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "event_id must be uuid v4" }))),
    }
    let conn = app.db.lock().unwrap();
    let ev = match crate::storage::db::get_event(&conn, &id) { Ok(v) => v, Err(_) => return (StatusCode::NOT_FOUND, Json(json!({ "error": "not_found" }))) };
    let blob = match crate::storage::db::get_blob_index(&conn, &ev.content_hash) { Ok(Some((p, r))) => Some(json!({ "path": p, "ref_count": r })), _ => None };
    let resp = json!({ "event": ev, "blob": blob });
    (StatusCode::OK, Json(resp))
}

pub async fn purge(
    State(app): State<std::sync::Arc<crate::state::AppState>>,
    headers: HeaderMap,
    Json(req): Json<PurgeRequest>,
) -> (StatusCode, Json<Value>) {
    if let Err((code, body)) = validate_client(&headers) { return (code, body); }
    if let Some(ids) = req.event_ids.as_ref() {
        for id in ids {
            match uuid::Uuid::parse_str(id) { Ok(u) if u.get_version() == Some(uuid::Version::Random) => {}, _ => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "invalid event_id in list" }))) }
        }
    }
    if let Some(s) = req.start.as_ref() {
        if time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339).is_err() {
            return (StatusCode::BAD_REQUEST, Json(json!({ "error": "start must be RFC3339" })));
        }
    }
    if let Some(e) = req.end.as_ref() {
        if time::OffsetDateTime::parse(e, &time::format_description::well_known::Rfc3339).is_err() {
            return (StatusCode::BAD_REQUEST, Json(json!({ "error": "end must be RFC3339" })));
        }
    }
    let privacy_str = req.privacy_flag.as_ref().map(|p| match p {
        PrivacyFlag::Default => "default".to_string(),
        PrivacyFlag::Sensitive => "sensitive".to_string(),
        PrivacyFlag::NeverStore => "never_store".to_string(),
    });

    let criteria = crate::storage::db::PurgeCriteria {
        event_ids: req.event_ids.clone(),
        start: req.start.clone(),
        end: req.end.clone(),
        app: req.app.clone(),
        source: req.source.clone(),
        privacy_flag: privacy_str,
    };
    let mut conn = app.db.lock().unwrap();
    match crate::storage::db::purge_events(&mut conn, criteria) {
        Ok((de, db)) => (StatusCode::OK, Json(json!({ "deleted_events": de, "deleted_blobs": db }))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() }))),
    }
}

fn validate_client(headers: &HeaderMap) -> Result<(), (StatusCode, Json<Value>)> {
    const ALLOWED: [&str; 3] = ["browser-extension", "vscode", "desktop-app"];
    match headers.get("X-Vyaso-Local-Client").and_then(|v| v.to_str().ok()) {
        None => Err((StatusCode::UNAUTHORIZED, Json(json!({ "error": "missing X-Vyaso-Local-Client" })))),
        Some(v) if !ALLOWED.contains(&v) => Err((StatusCode::FORBIDDEN, Json(json!({ "error": "client not allowed" })))),
        _ => Ok(())
    }
}