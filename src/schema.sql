CREATE TABLE IF NOT EXISTS tasks (id text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS challenges (id text PRIMARY KEY, wallet text NOT NULL, message text NOT NULL, expires_at timestamptz NOT NULL, consumed boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, wallet text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS idempotency (key text PRIMARY KEY, fingerprint text NOT NULL, response jsonb NOT NULL, status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS live_attempts (id bigserial PRIMARY KEY, task_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS attempts_date ON live_attempts(created_at);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS session_nonce text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS verify_key text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS signature_hash text;
