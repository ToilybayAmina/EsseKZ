CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, thesis TEXT NOT NULL DEFAULT '', essay_text TEXT NOT NULL,
  essay_type TEXT NOT NULL, style TEXT NOT NULL, word_count INTEGER NOT NULL,
  target_word_count INTEGER NOT NULL, audience TEXT NOT NULL, arguments_count INTEGER NOT NULL,
  include_counterargument BOOLEAN NOT NULL DEFAULT FALSE, include_sources BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL CHECK (source IN ('manual','gemini')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS essays_user_created_idx ON essays(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
