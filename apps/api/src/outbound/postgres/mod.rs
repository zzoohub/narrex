use sqlx::postgres::PgPool;

/// Postgres adapter — implements all repository traits via a shared `PgPool`.
#[derive(Clone)]
pub struct Postgres {
    pool: PgPool,
}

impl Postgres {
    /// Connect to the database and return a `Postgres` adapter.
    ///
    /// This method is the only place `sqlx::PgPool` is constructed, keeping
    /// pool creation out of `main.rs`.
    pub async fn connect(database_url: &str) -> anyhow::Result<Self> {
        let pool = PgPool::connect(database_url).await?;
        Ok(Self { pool })
    }

    /// Expose a reference to the underlying pool for health checks.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

pub mod character;
pub mod connection;
pub mod context;
pub mod draft;
pub mod generation_log;
pub mod project;
pub mod relationship;
pub mod sample;
pub mod scene;
pub mod scene_summary;
pub mod track;
pub mod user;
