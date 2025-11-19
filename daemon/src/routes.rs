use axum::{routing::{get, post}, Router};

use crate::handlers::{health, post_event, get_mem, purge};
use crate::state::AppState;

pub fn router(app_state: std::sync::Arc<AppState>) -> Router {
    Router::new()
        .route("/v1/health", get(health))
        .route("/v1/events", post(post_event))
        .route("/v1/mem/:id", get(get_mem))
        .route("/v1/purge", post(purge))
        .with_state(app_state)
}
