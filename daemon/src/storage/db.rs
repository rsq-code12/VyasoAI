use crate::handlers::EventEnvelope;
use crate::storage::Result;
use rusqlite::{params, Connection, OptionalExtension, ToSql};
use std::path::{Path, PathBuf};
use std::fs;

const DDL: &str = r#"
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT,
  source TEXT,
  app TEXT,
  content_pointer TEXT,
  content_hash TEXT,
  size_bytes INTEGER,
  tags TEXT,
  privacy_flag TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(content_hash) REFERENCES blob_index(blob_hash)
);

CREATE TABLE IF NOT EXISTS blob_index (
  blob_hash TEXT PRIMARY KEY,
  blob_path TEXT,
  ref_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chunks (
  chunk_id TEXT PRIMARY KEY,
  event_id TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  content_type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(event_id) REFERENCES events(event_id)
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_app ON events(app);
CREATE INDEX IF NOT EXISTS idx_events_content_hash ON events(content_hash);
CREATE INDEX IF NOT EXISTS idx_chunks_event_id ON chunks(event_id);
"#;

pub fn init_db(db_path: &Path) -> Result<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    conn.execute_batch(DDL)?;
    // WAL improves durability for local apps; can be revisited later
    let _ = conn.pragma_update(None, "journal_mode", &"WAL" as &dyn ToSql);
    Ok(conn)
}

/// Upsert blob_index for the given content_hash. Returns blob_path.
fn upsert_blob_index(conn: &Connection, content_hash: &str) -> Result<String> {
    // Check existence
    let existing: Option<(String, i64)> = conn
        .query_row(
            "SELECT blob_path, ref_count FROM blob_index WHERE blob_hash = ?1",
            params![content_hash],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()?;

    match existing {
        Some((path, ref_count)) => {
            conn.execute(
                "UPDATE blob_index SET ref_count = ?2 WHERE blob_hash = ?1",
                params![content_hash, ref_count + 1],
            )?;
            Ok(path)
        }
        None => {
            // Deterministic path using current date and hash
            let now = time::OffsetDateTime::now_utc();
            let (y, m, d) = (now.year(), now.month() as u8, now.day());
            let blob_path = format!("data/blobs/{:04}/{:02}/{:02}/{}.zst.enc", y, m, d, content_hash);
            let path = PathBuf::from(&blob_path);
            if let Some(parent) = path.parent() { std::fs::create_dir_all(parent)?; }

            conn.execute(
                "INSERT INTO blob_index (blob_hash, blob_path, ref_count) VALUES (?1, ?2, 1)",
                params![content_hash, blob_path],
            )?;
            Ok(blob_path)
        }
    }
}

/// Inserts event metadata and ensures blob_index ref_count is maintained.
pub fn insert_event(conn: &Connection, env: &EventEnvelope) -> Result<()> {
    // Ensure blob_index exists/up-to-date for FK safety
    let blob_path = upsert_blob_index(conn, &env.content_hash)?;

    // Insert event row
    conn.execute(
        r#"INSERT INTO events (
            event_id, timestamp, source, app, content_pointer, content_hash,
            size_bytes, tags, privacy_flag
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
        params![
            env.event_id,
            env.timestamp,
            env.source,
            env.app,
            // Use blob_path if content_pointer is empty/null-like
            if env.content_pointer.trim().is_empty() { blob_path } else { env.content_pointer.clone() },
            env.content_hash,
            env.size_bytes as i64,
            serde_json::to_string(&env.tags)?,
            match env.privacy_flag {
                crate::handlers::PrivacyFlag::Default => "default",
                crate::handlers::PrivacyFlag::Sensitive => "sensitive",
                crate::handlers::PrivacyFlag::NeverStore => "never_store",
            },
        ],
    )?;
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ChunkRow {
    pub chunk_id: String,
    pub event_id: String,
    pub start_offset: i64,
    pub end_offset: i64,
    pub content_type: String,
}

pub fn insert_chunks(conn: &Connection, chunks: &[ChunkRow]) -> Result<u64> {
    let mut inserted: u64 = 0;
    for c in chunks {
        conn.execute(
            r#"INSERT OR IGNORE INTO chunks (chunk_id, event_id, start_offset, end_offset, content_type)
               VALUES (?1, ?2, ?3, ?4, ?5)"#,
            params![
                c.chunk_id,
                c.event_id,
                c.start_offset,
                c.end_offset,
                c.content_type,
            ],
        )?;
        inserted += 1;
    }
    Ok(inserted)
}

pub fn get_event(conn: &Connection, id: &str) -> Result<EventEnvelope> {
    let row = conn.query_row(
        "SELECT event_id, timestamp, source, app, content_pointer, content_hash, size_bytes, tags, privacy_flag FROM events WHERE event_id = ?1",
        params![id],
        |row| {
            let tags_json: String = row.get(7)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let privacy: String = row.get(8)?;
            let privacy_flag = match privacy.as_str() {
                "sensitive" => crate::handlers::PrivacyFlag::Sensitive,
                "never_store" => crate::handlers::PrivacyFlag::NeverStore,
                _ => crate::handlers::PrivacyFlag::Default,
            };
            Ok(EventEnvelope {
                event_id: row.get(0)?,
                timestamp: row.get(1)?,
                source: row.get(2)?,
                app: row.get(3)?,
                content_pointer: row.get(4)?,
                content_hash: row.get(5)?,
                size_bytes: row.get::<_, i64>(6)? as u64,
                tags,
                privacy_flag,
            })
        },
    )?;
    Ok(row)
}

pub fn query_events_by_timerange(conn: &Connection, start: &str, end: &str) -> Result<Vec<EventEnvelope>> {
    let mut stmt = conn.prepare(
        "SELECT event_id, timestamp, source, app, content_pointer, content_hash, size_bytes, tags, privacy_flag FROM events WHERE timestamp BETWEEN ?1 AND ?2 ORDER BY timestamp"
    )?;
    let rows = stmt.query_map(params![start, end], |row| {
        let tags_json: String = row.get(7)?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
        let privacy: String = row.get(8)?;
        let privacy_flag = match privacy.as_str() {
            "sensitive" => crate::handlers::PrivacyFlag::Sensitive,
            "never_store" => crate::handlers::PrivacyFlag::NeverStore,
            _ => crate::handlers::PrivacyFlag::Default,
        };
        Ok(EventEnvelope {
            event_id: row.get(0)?,
            timestamp: row.get(1)?,
            source: row.get(2)?,
            app: row.get(3)?,
            content_pointer: row.get(4)?,
            content_hash: row.get(5)?,
            size_bytes: row.get::<_, i64>(6)? as u64,
            tags,
            privacy_flag,
        })
    })?;
    let mut out = Vec::new();
    for r in rows { out.push(r?); }
    Ok(out)
}

pub fn query_events_by_app_source(conn: &Connection, app: Option<&str>, source: Option<&str>) -> Result<Vec<EventEnvelope>> {
    let mut sql = String::from("SELECT event_id, timestamp, source, app, content_pointer, content_hash, size_bytes, tags, privacy_flag FROM events");
    let mut clauses = Vec::new();
    let mut params_vec: Vec<String> = Vec::new();
    if let Some(a) = app { clauses.push("app = ?"); params_vec.push(a.to_string()); }
    if let Some(s) = source { clauses.push("source = ?"); params_vec.push(s.to_string()); }
    if !clauses.is_empty() { sql.push_str(" WHERE "); sql.push_str(&clauses.join(" AND ")); }
    sql.push_str(" ORDER BY timestamp");

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        let tags_json: String = row.get(7)?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
        let privacy: String = row.get(8)?;
        let privacy_flag = match privacy.as_str() {
            "sensitive" => crate::handlers::PrivacyFlag::Sensitive,
            "never_store" => crate::handlers::PrivacyFlag::NeverStore,
            _ => crate::handlers::PrivacyFlag::Default,
        };
        Ok(EventEnvelope {
            event_id: row.get(0)?,
            timestamp: row.get(1)?,
            source: row.get(2)?,
            app: row.get(3)?,
            content_pointer: row.get(4)?,
            content_hash: row.get(5)?,
            size_bytes: row.get::<_, i64>(6)? as u64,
            tags,
            privacy_flag,
        })
    })?;
    let mut out = Vec::new();
    for r in rows { out.push(r?); }
    Ok(out)
}

pub fn get_blob_index(conn: &Connection, hash: &str) -> Result<Option<(String, i64)>> {
    let row: Option<(String, i64)> = conn
        .query_row(
            "SELECT blob_path, ref_count FROM blob_index WHERE blob_hash = ?1",
            params![hash],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    Ok(row)
}

#[derive(Default)]
pub struct PurgeCriteria {
    pub event_ids: Option<Vec<String>>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub app: Option<String>,
    pub source: Option<String>,
    pub privacy_flag: Option<String>,
}

pub fn purge_events(conn: &mut Connection, c: PurgeCriteria) -> Result<(u64, u64)> {
    let mut where_clauses: Vec<String> = Vec::new();
    let mut params_vec: Vec<String> = Vec::new();

    if let Some(ids) = c.event_ids.as_ref() {
        if !ids.is_empty() {
            let placeholders = std::iter::repeat("?").take(ids.len()).collect::<Vec<_>>().join(", ");
            where_clauses.push(format!("event_id IN ({})", placeholders));
            for id in ids { params_vec.push(id.clone()); }
        }
    }
    if let (Some(s), Some(e)) = (c.start.as_ref(), c.end.as_ref()) {
        where_clauses.push("timestamp BETWEEN ? AND ?".to_string());
        params_vec.push(s.clone());
        params_vec.push(e.clone());
    } else {
        if let Some(s) = c.start.as_ref() { where_clauses.push("timestamp >= ?".to_string()); params_vec.push(s.clone()); }
        if let Some(e) = c.end.as_ref() { where_clauses.push("timestamp <= ?".to_string()); params_vec.push(e.clone()); }
    }
    if let Some(a) = c.app.as_ref() { where_clauses.push("app = ?".to_string()); params_vec.push(a.clone()); }
    if let Some(s) = c.source.as_ref() { where_clauses.push("source = ?".to_string()); params_vec.push(s.clone()); }
    if let Some(p) = c.privacy_flag.as_ref() { where_clauses.push("privacy_flag = ?".to_string()); params_vec.push(p.clone()); }

    if where_clauses.is_empty() { return Ok((0, 0)); }

    let tx = conn.transaction()?;
    // Purge matching events and update blob_index based on remaining references.
    let mut select_hashes_sql = String::from("SELECT DISTINCT content_hash FROM events");
    select_hashes_sql.push_str(" WHERE ");
    select_hashes_sql.push_str(&where_clauses.join(" AND "));
    let impacted_hashes: Vec<String> = {
        let mut stmt = tx.prepare(&select_hashes_sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
            Ok(row.get(0)?)
        })?;
        let mut v = Vec::new();
        for r in rows { v.push(r?); }
        v
    };
    let mut pre_index: Vec<(String, Option<(String, i64)>, bool)> = Vec::new();
    for h in impacted_hashes.iter() {
        let row: Option<(String, i64)> = tx
            .query_row(
                "SELECT blob_path, ref_count FROM blob_index WHERE blob_hash = ?1",
                params![h],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;
        let existed = row.is_some();
        pre_index.push((h.clone(), row, existed));
    }

    let where_sql = where_clauses.join(" AND ");
    let deleted_events: u64;
    // Prefer precise deletion when event_ids provided
    if let Some(ids) = c.event_ids.as_ref() {
        // Capture impacted hashes before deletion
        let impacted_hashes: Vec<String> = {
            let mut stmt = tx.prepare(&format!("SELECT DISTINCT content_hash FROM events WHERE {}", where_sql))?;
            let rows = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| Ok(row.get(0)?))?;
            let mut v = Vec::new();
            for r in rows { if let Ok(s) = r { v.push(s); } }
            v
        };
        // Delete each event id individually
        for id in ids {
            let _ = tx.execute("DELETE FROM events WHERE event_id = ?1", params![id])?;
        }
        deleted_events = ids.len() as u64;
        // Recompute blob_index for impacted hashes
        for (hash, _pre_row, _existed) in pre_index.clone().into_iter() {
            let pre: Option<(String, i64)> = tx
                .query_row(
                    "SELECT blob_path, ref_count FROM blob_index WHERE blob_hash = ?1",
                    params![hash],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .optional()?;
            let remaining: i64 = tx.query_row(
                "SELECT COUNT(*) FROM events WHERE content_hash = ?1",
                params![hash],
                |row| row.get::<_, i64>(0),
            )?;
            if let Some((blob_path, _pre_ref)) = pre {
                tx.execute(
                    "UPDATE blob_index SET ref_count = ?2 WHERE blob_hash = ?1",
                    params![hash, remaining],
                )?;
                if remaining <= 0 {
                    let _ = fs::remove_file(&blob_path);
                    tx.execute("DELETE FROM blob_index WHERE blob_hash = ?1", params![hash])?;
                }
            }
        }
        tx.commit()?;
        return Ok((deleted_events, impacted_hashes.len() as u64));
    } else {
        let delete_sql = format!("DELETE FROM events WHERE {}", where_sql);
        deleted_events = tx.execute(&delete_sql, rusqlite::params_from_iter(params_vec.iter()))? as u64;
    }

    let mut deleted_blobs: u64 = 0;
    for (hash, pre, existed) in pre_index.into_iter() {
        let remaining: i64 = tx.query_row(
            "SELECT COUNT(*) FROM events WHERE content_hash = ?1",
            params![hash],
            |row| row.get::<_, i64>(0),
        )?;
        match pre {
            Some((blob_path, pre_ref)) => {
                tx.execute(
                    "UPDATE blob_index SET ref_count = ?2 WHERE blob_hash = ?1",
                    params![hash, remaining],
                )?;
                if remaining <= 0 && pre_ref > 0 {
                    let _ = fs::remove_file(&blob_path);
                    tx.execute("DELETE FROM blob_index WHERE blob_hash = ?1", params![hash])?;
                    deleted_blobs += 1;
                }
            }
            None => {
                // no index row; if remaining is zero, count as deleted blob logically
                if remaining <= 0 { deleted_blobs += 1; }
            }
        }
        if existed {
            let post_exists: Option<i32> = tx
                .query_row(
                    "SELECT 1 FROM blob_index WHERE blob_hash = ?1",
                    params![hash],
                    |row| Ok(row.get(0)?),
                )
                .optional()?;
            if post_exists.is_none() && remaining <= 0 {
                // already counted above in Some branch; ensure consistency in case of FS deletion failure
                // no-op
            }
        }
    }

    tx.commit()?;
    Ok((deleted_events, deleted_blobs))
}