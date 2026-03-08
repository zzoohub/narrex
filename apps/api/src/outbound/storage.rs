use aws_sdk_s3::config::{Builder, Credentials, Region};
use aws_sdk_s3::Client;
use uuid::Uuid;

use crate::domain::auth::error::AuthError;
use crate::domain::auth::ports::AvatarStorage;

#[derive(Clone)]
pub struct R2Storage {
    client: Client,
    bucket: String,
    public_url: String,
}

impl R2Storage {
    pub fn new(
        account_id: &str,
        access_key_id: &str,
        secret_access_key: &str,
        bucket: &str,
        public_url: &str,
    ) -> Self {
        let endpoint = format!("https://{account_id}.r2.cloudflarestorage.com");
        let credentials = Credentials::new(access_key_id, secret_access_key, None, None, "r2");
        let config = Builder::new()
            .behavior_version_latest()
            .endpoint_url(&endpoint)
            .credentials_provider(credentials)
            .region(Region::new("auto"))
            .force_path_style(true)
            .build();
        let client = Client::from_conf(config);

        Self {
            client,
            bucket: bucket.to_string(),
            public_url: public_url.trim_end_matches('/').to_string(),
        }
    }
}

#[async_trait::async_trait]
impl AvatarStorage for R2Storage {
    async fn upload_avatar(
        &self,
        user_id: Uuid,
        content_type: &str,
        data: Vec<u8>,
    ) -> Result<String, AuthError> {
        let ext = match content_type {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            _ => return Err(AuthError::InvalidInput("unsupported image format".into())),
        };

        let key = format!("avatars/{user_id}.{ext}");
        let body = aws_sdk_s3::primitives::ByteStream::from(data);

        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(&key)
            .body(body)
            .content_type(content_type)
            .cache_control("public, max-age=31536000, immutable")
            .send()
            .await
            .map_err(|e| AuthError::Unknown(anyhow::anyhow!("R2 upload failed: {e}")))?;

        Ok(format!("{}/{key}", self.public_url))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn r2_storage_trims_trailing_slash_from_public_url() {
        let storage = R2Storage::new(
            "test-account",
            "key-id",
            "secret",
            "test-bucket",
            "https://assets.example.com/",
        );
        assert_eq!(storage.public_url, "https://assets.example.com");
    }

    #[test]
    fn r2_storage_preserves_clean_public_url() {
        let storage = R2Storage::new(
            "test-account",
            "key-id",
            "secret",
            "test-bucket",
            "https://assets.example.com",
        );
        assert_eq!(storage.public_url, "https://assets.example.com");
    }

    #[test]
    fn r2_storage_stores_bucket_name() {
        let storage = R2Storage::new(
            "test-account",
            "key-id",
            "secret",
            "my-bucket",
            "https://assets.example.com",
        );
        assert_eq!(storage.bucket, "my-bucket");
    }
}
