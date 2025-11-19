use axum::Router;
#[cfg(all(not(target_os = "windows"), feature = "uds"))]
use hyper_util::server::accept::Accept;
use tokio::net::TcpListener;
#[cfg(all(not(target_os = "windows"), feature = "uds"))]
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::mpsc;
use tracing::info;
#[cfg(all(not(target_os = "windows"), feature = "uds"))]
use tracing::error;

use vyasoai_daemon::{routes, queue, storage::{db, blobs}, state};
use vyasoai_daemon::index;
use std::sync::{Arc, Mutex};

#[tokio::main]
async fn main() -> vyasoai_daemon::storage::Result<()> {
    init_logging();

    let db_path = std::path::PathBuf::from("data/vyaso.db");
    let conn = db::init_db(&db_path)?;
    blobs::ensure_blob_base()?;
    blobs::ensure_today_blob_dir()?;
    let (tx, rx) = mpsc::channel::<state::IngestJob>(1024);
    let app_state = Arc::new(state::AppState { db: Arc::new(Mutex::new(conn)), queue_tx: tx.clone(), key_manager: Some(state::KeyManager::new()) });
    let worker = queue::start_worker(rx, app_state.clone());
    let app: Router = routes::router(app_state.clone());

    #[cfg(target_os = "windows")]
    {
        let addr = "127.0.0.1:8765";
        let listener = TcpListener::bind(addr).await?;
        info!(%addr, db_path = %db_path.display(), "Vyaso AI daemon listening on TCP loopback");
        axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await.map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
        drop(app_state);
        let _ = worker.await;
        info!("server stopped; worker drained");
        index::flush_vector_index();
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), feature = "uds"))]
    {
        let sock_path = resolve_unix_socket_path()?;
        let _ = std::fs::remove_file(&sock_path);
        let listener = UnixListener::bind(&sock_path)?;
        info!(path = %sock_path.display(), db_path = %db_path.display(), "Vyaso AI daemon listening on Unix Domain Socket");
        let incoming = UdsIncoming { listener };
        axum::serve(incoming, app).with_graceful_shutdown(shutdown_signal()).await.map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
        drop(app_state);
        let _ = worker.await;
        info!("server stopped; worker drained");
        index::flush_vector_index();
        Ok(())
    }
    #[cfg(all(not(target_os = "windows"), not(feature = "uds")))]
    {
        let addr = "127.0.0.1:8765";
        let listener = TcpListener::bind(addr).await?;
        info!(%addr, db_path = %db_path.display(), "Vyaso AI daemon listening on TCP loopback (fallback on non-Windows)");
        axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await.map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { e.into() })?;
        drop(app_state);
        let _ = worker.await;
        info!("server stopped; worker drained");
        index::flush_vector_index();
        Ok(())
}
}

fn init_logging() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .try_init();
}

async fn shutdown_signal() {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let mut term = signal(SignalKind::terminate()).expect("install SIGTERM handler");
        let ctrl_c = tokio::signal::ctrl_c();
        tokio::select! { _ = ctrl_c => {}, _ = term.recv() => {} }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
    }
    info!("shutdown signal received");
}

#[cfg(all(not(target_os = "windows"), feature = "uds"))]
fn resolve_unix_socket_path() -> io::Result<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let dir = PathBuf::from(home).join("Library").join("Application Support").join("VyasoAI");
        std::fs::create_dir_all(&dir)?;
        Ok(dir.join("vyasoai.sock"))
    }
    #[cfg(target_os = "linux")]
    {
        let base = env::var("XDG_RUNTIME_DIR").unwrap_or_else(|_| "/tmp".to_string());
        let dir = PathBuf::from(base);
        std::fs::create_dir_all(&dir)?;
        Ok(dir.join("vyasoai.sock"))
    }
    #[cfg(all(unix, not(any(target_os = "macos", target_os = "linux"))))]
    {
        let dir = PathBuf::from("/tmp");
        Ok(dir.join("vyasoai.sock"))
    }
}

#[cfg(all(not(target_os = "windows"), feature = "uds"))]
struct UdsIncoming {
    listener: UnixListener,
}

#[cfg(all(not(target_os = "windows"), feature = "uds"))]
impl Accept for UdsIncoming {
    type Conn = UnixStream;
    type Error = io::Error;

    fn poll_accept(self: std::pin::Pin<&mut Self>, cx: &mut std::task::Context<'_>) -> std::task::Poll<Result<Self::Conn, Self::Error>> {
        let this = self.get_mut();
        match this.listener.poll_accept(cx) {
            Poll::Ready(Ok((stream, _addr))) => Poll::Ready(Ok(stream)),
            Poll::Ready(Err(e)) => {
                error!(error = %e, "UDS accept error");
                Poll::Ready(Err(e))
            }
            Poll::Pending => Poll::Pending,
        }
    }
}