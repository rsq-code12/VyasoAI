#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{Manager, SystemTray, SystemTrayEvent, CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem, Menu, Submenu};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone)]
struct Memory {
  id: String,
  title: String,
  snippet: String,
  timestamp: String,
  source: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Provenance {
  docId: String,
  score: f32,
  excerpt: String,
  source: String,
}

#[tauri::command]
async fn get_recent_memories() -> Result<Vec<Memory>, String> {
  let url = std::env::var("VYASOAI_DAEMON_URL").unwrap_or_else(|_| "http://127.0.0.1:8777".to_string());
  let client = reqwest::Client::new();
  let res = client
    .get(format!("{}/v1/timeline", url))
    .send()
    .await
    .map_err(|e| e.to_string())?;
  if res.status().is_success() {
    let v = res.json::<Vec<Memory>>().await.map_err(|e| e.to_string())?;
    Ok(v)
  } else {
    Err(format!("status {}", res.status()))
  }
}

#[derive(Deserialize)]
struct SearchFilters { source: Option<String>, start: Option<String>, end: Option<String> }

#[tauri::command]
async fn search_memories(query: String, filters: Option<SearchFilters>) -> Result<serde_json::Value, String> {
  let url = std::env::var("VYASOAI_DAEMON_URL").unwrap_or_else(|_| "http://127.0.0.1:8777".to_string());
  let client = reqwest::Client::new();
  let mut payload = serde_json::json!({ "query": query });
  if let Some(f) = filters { payload["filters"] = serde_json::to_value(&f).map_err(|e| e.to_string())?; }
  let res = client
    .post(format!("{}/v1/memories/search", url))
    .json(&payload)
    .send()
    .await
    .map_err(|e| e.to_string())?;
  let v = res.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
  Ok(v)
}

#[tauri::command]
async fn rag_query(query: String) -> Result<serde_json::Value, String> {
  let url = std::env::var("VYASOAI_DAEMON_URL").unwrap_or_else(|_| "http://127.0.0.1:8777".to_string());
  let client = reqwest::Client::new();
  let res = client
    .post(format!("{}/v1/rag/query", url))
    .json(&serde_json::json!({ "query": query }))
    .send()
    .await
    .map_err(|e| e.to_string())?;
  let v = res.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
  Ok(v)
}

#[derive(Deserialize)]
struct PurgeFilters { source: Option<String>, start: Option<String>, end: Option<String> }

#[tauri::command]
async fn purge(filters: Option<PurgeFilters>) -> Result<serde_json::Value, String> {
  let url = std::env::var("VYASOAI_DAEMON_URL").unwrap_or_else(|_| "http://127.0.0.1:8777".to_string());
  let client = reqwest::Client::new();
  let mut payload = serde_json::json!({});
  if let Some(f) = filters { payload["filters"] = serde_json::to_value(&f).map_err(|e| e.to_string())?; }
  let res = client
    .post(format!("{}/v1/purge", url))
    .json(&payload)
    .send()
    .await
    .map_err(|e| e.to_string())?;
  let v = res.json::<serde_json::Value>().await.map_err(|e| e.to_string())?;
  Ok(v)
}

fn tray_menu() -> SystemTrayMenu {
  let toggle = CustomMenuItem::new("toggle_capture", "Pause Capture");
  let open = CustomMenuItem::new("open", "Open App");
  SystemTrayMenu::new()
    .add_item(toggle)
    .add_native_item(SystemTrayMenuItem::Separator)
    .add_item(open)
}

fn app_menu() -> Menu {
  let file = Submenu::new("File", Menu::new());
  let edit = Submenu::new("Edit", Menu::new());
  let view = Submenu::new("View", Menu::new());
  Menu::new().add_submenu(file).add_submenu(edit).add_submenu(view)
}

struct AppState { paused: Mutex<bool> }

fn main() {
  tauri::Builder::default()
    .manage(AppState { paused: Mutex::new(false) })
    .invoke_handler(tauri::generate_handler![get_recent_memories, search_memories, rag_query, purge])
    .menu(app_menu())
    .system_tray(SystemTray::new().with_menu(tray_menu()))
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::MenuItemClick { id, .. } => {
        let url = std::env::var("VYASOAI_DAEMON_URL").unwrap_or_else(|_| "http://127.0.0.1:8777".to_string());
        let handle = app.app_handle().clone();
        match id.as_str() {
          "toggle_capture" => {
            let state = app.state::<AppState>();
            let mut paused = state.paused.lock().unwrap();
            let to_pause = !*paused;
            let tray = handle.tray_handle();
            if to_pause {
              tauri::async_runtime::spawn(async move {
                let _ = reqwest::Client::new().post(format!("{}/v1/pause", url)).send().await;
              });
              *paused = true;
              let _ = tray.get_item("toggle_capture").set_title("Resume Capture");
            } else {
              tauri::async_runtime::spawn(async move {
                let _ = reqwest::Client::new().post(format!("{}/v1/resume", url)).send().await;
              });
              *paused = false;
              let _ = tray.get_item("toggle_capture").set_title("Pause Capture");
            }
          }
          "open" => {
            let _ = handle.get_window("main").map(|w| w.show());
          }
          _ => {}
        }
      }
      _ => {}
    })
    .run(tauri::generate_context!())
    .expect("error while running VyasoAI");
}