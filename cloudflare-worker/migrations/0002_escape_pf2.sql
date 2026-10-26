-- Additive pf-2 namespace. Existing pf-1 tables/rows are never rewritten or dropped.
CREATE TABLE IF NOT EXISTS runs_v2 (
  id TEXT PRIMARY KEY, player_hash TEXT NOT NULL, version TEXT NOT NULL CHECK(version='pf-2'),
  mode TEXT NOT NULL CHECK(mode IN ('normal','daily')), day TEXT NOT NULL, seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER, submission_hash TEXT,
  alias TEXT, score INTEGER, gates INTEGER, fragments INTEGER, bonus_points INTEGER, confirmation TEXT,
  CHECK ((consumed_at IS NULL AND submission_hash IS NULL) OR (consumed_at IS NOT NULL AND submission_hash IS NOT NULL)),
  CHECK (score IS NULL OR (typeof(score)='integer' AND typeof(gates)='integer' AND typeof(fragments)='integer' AND typeof(bonus_points)='integer' AND gates BETWEEN 0 AND 1000 AND fragments BETWEEN 0 AND gates
    AND bonus_points BETWEEN 2*fragments AND CASE WHEN fragments<=5 THEN fragments*(fragments+1) ELSE 30+(fragments-5)*10 END
    AND bonus_points%2=0 AND score=10*gates+bonus_points AND score BETWEEN 0 AND 19980))
);
CREATE INDEX IF NOT EXISTS runs_v2_expiry ON runs_v2(expires_at);
CREATE TABLE IF NOT EXISTS scores_v2 (
  entry_id TEXT NOT NULL UNIQUE, player_hash TEXT NOT NULL, version TEXT NOT NULL CHECK(version='pf-2'),
  mode TEXT NOT NULL CHECK(mode IN ('normal','daily')), day TEXT NOT NULL, alias TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 19980), gates INTEGER NOT NULL CHECK(gates BETWEEN 0 AND 1000),
  fragments INTEGER NOT NULL CHECK(fragments BETWEEN 0 AND gates), bonus_points INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(player_hash,version,mode,day),
  CHECK (typeof(score)='integer' AND typeof(gates)='integer' AND typeof(fragments)='integer' AND typeof(bonus_points)='integer'),
  CHECK (bonus_points%2=0 AND bonus_points BETWEEN fragments*2 AND CASE WHEN fragments<=5 THEN fragments*(fragments+1) ELSE 30+(fragments-5)*10 END),
  CHECK (score=gates*10+bonus_points)
);
CREATE INDEX IF NOT EXISTS scores_v2_board ON scores_v2(version,mode,day,score DESC,achieved_at ASC,entry_id ASC);
CREATE INDEX IF NOT EXISTS scores_v2_retention ON scores_v2(mode,day,achieved_at);
CREATE TABLE IF NOT EXISTS rate_buckets (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_buckets(expires_at);
