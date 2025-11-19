//! Storage module: SQLite schema, blob store, encryption-at-rest (dev mode), and deduplication.
//!
//! This module provides:
//! - SQLite DDL and initialization (events + blob_index)
//! - Insert/query functions returning strongly typed `EventEnvelope`
//! - Blob store with zstd compression and AES-256-GCM dev-mode encryption
//! - SHA-256 hashing and deduplication via `blob_index`
//!
//!
pub mod db;
pub mod blobs;
pub mod crypto;
pub mod hash;

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;