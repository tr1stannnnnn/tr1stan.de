-- Additive migration. Never drop an existing application table.
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  player_hash TEXT NOT NULL,
  version TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('normal', 'daily')),
  day TEXT NOT NULL,
  seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  submission_hash TEXT,
  alias TEXT,
  score INTEGER CHECK (score BETWEEN 0 AND 1000),
  confirmation TEXT,
  CHECK ((consumed_at IS NULL AND submission_hash IS NULL) OR (consumed_at IS NOT NULL AND submission_hash IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS runs_expiry ON runs(expires_at);
CREATE TABLE IF NOT EXISTS scores (
  entry_id TEXT NOT NULL UNIQUE,
  player_hash TEXT NOT NULL,
  version TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('normal', 'daily')),
  day TEXT NOT NULL,
  alias TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000),
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (player_hash, version, mode, day)
);
CREATE INDEX IF NOT EXISTS scores_board ON scores(version, mode, day, score DESC, achieved_at ASC, entry_id ASC);
CREATE INDEX IF NOT EXISTS scores_daily_retention ON scores(mode, day);
CREATE TABLE IF NOT EXISTS rate_buckets (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_buckets(expires_at);
