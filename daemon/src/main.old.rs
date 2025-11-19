use std::{env, io, path::PathBuf, pin::Pin, task::{Context, Poll}};

use axum::Router;
use hyper_util::server::accept::Accept;
use tokio::net::{TcpListener, UnixListener, UnixStream};
use tokio::sync::mpsc;
use tracing::{info, error};

mod routes;
mod handlers;
mod queue;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    init_logging();

    let (tx, rx) = mpsc::channel(1024);
    queue::start_worker(rx);
    let app: Router = routes::router(tx);

    #[cfg(target_os = "windows")]
    {
        let addr = "127.0.0.1:8765";
        let listener = TcpListener::bind(addr).await?;
        info!(%addr, "Vyaso AI daemon listening on TCP loopback");
        axum::serve(listener, app).await.map_err(|e| e.into())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let sock_path = resolve_unix_socket_path()?;
        // If an old socket file exists, remove it.
        let _ = std::fs::remove_file(&sock_path);
        let listener = UnixListener::bind(&sock_path)?;
        info!(path = %sock_path.display(), "Vyaso AI daemon listening on Unix Domain Socket");
        let incoming = UdsIncoming { listener };
        hyper::Server::builder(incoming)
            .serve(app.into_make_service())
            .await?;
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

#[cfg(not(target_os = "windows"))]
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

#[cfg(not(target_os = "windows"))]
struct UdsIncoming {
    listener: UnixListener,
}

#[cfg(not(target_os = "windows"))]
impl Accept for UdsIncoming {
    type Conn = UnixStream;
    type Error = io::Error;

    fn poll_accept(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<Self::Conn, Self::Error>> {
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