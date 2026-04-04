-- Run this once in your Neon SQL console to set up the leaderboard table.

CREATE TABLE IF NOT EXISTS scores (
  id          SERIAL PRIMARY KEY,
  player_name VARCHAR(50)  NOT NULL,
  score       INTEGER      NOT NULL CHECK (score >= 0 AND score <= 300),
  game_mode   VARCHAR(10)  NOT NULL CHECK (game_mode IN ('NORMAL', 'MIGA')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_mode_score
  ON scores (game_mode, score DESC, created_at ASC);
