-- SchmekelBets Database Schema
-- Run this against a PostgreSQL database to set up the schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  steam_id        VARCHAR(32) UNIQUE NOT NULL,
  username        VARCHAR(128) NOT NULL,
  avatar_url      TEXT,
  schmekels       INTEGER NOT NULL DEFAULT 100,
  daily_claimed   DATE,
  win_count       INTEGER NOT NULL DEFAULT 0,
  loss_count      INTEGER NOT NULL DEFAULT 0,
  total_wagered   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Sessions (for express-session with connect-pg-simple)
-- ============================================================
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default",
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);

-- ============================================================
-- Bet categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(64) UNIQUE NOT NULL,
  emoji VARCHAR(8) NOT NULL DEFAULT '🎲',
  color VARCHAR(16) NOT NULL DEFAULT '#22c55e'
);

INSERT INTO categories (name, emoji, color) VALUES
  ('Gaming',    '🎮', '#6366f1'),
  ('IRL',       '🌎', '#f59e0b'),
  ('Sports',    '⚽', '#3b82f6'),
  ('Esports',   '🏆', '#8b5cf6'),
  ('Misc',      '🎲', '#22c55e'),
  ('Food',      '🍕', '#ef4444'),
  ('Movies/TV', '🎬', '#ec4899')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Bets
-- ============================================================
CREATE TYPE bet_status AS ENUM ('open', 'closed', 'resolved', 'cancelled', 'disputed');

CREATE TABLE IF NOT EXISTS bets (
  id              SERIAL PRIMARY KEY,
  creator_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     INTEGER REFERENCES categories(id),
  title           VARCHAR(256) NOT NULL,
  description     TEXT,
  status          bet_status NOT NULL DEFAULT 'open',
  min_wager       INTEGER NOT NULL DEFAULT 1,
  max_wager       INTEGER,                -- NULL = unlimited
  closes_at       TIMESTAMPTZ,            -- NULL = open until manually closed
  resolved_at     TIMESTAMPTZ,
  winning_outcome_id INTEGER,             -- set on resolution
  resolve_notes   TEXT,
  is_private      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Bet outcomes (2-6 choices per bet)
-- ============================================================
CREATE TABLE IF NOT EXISTS bet_outcomes (
  id      SERIAL PRIMARY KEY,
  bet_id  INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  label   VARCHAR(128) NOT NULL,
  color   VARCHAR(16) NOT NULL DEFAULT '#22c55e',
  UNIQUE (bet_id, label)
);

-- Foreign key back-reference after outcomes table exists
ALTER TABLE bets ADD CONSTRAINT fk_winning_outcome
  FOREIGN KEY (winning_outcome_id) REFERENCES bet_outcomes(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- Bet placements
-- ============================================================
CREATE TABLE IF NOT EXISTS bet_placements (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet_id      INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  outcome_id  INTEGER NOT NULL REFERENCES bet_outcomes(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  payout      INTEGER,           -- filled in when bet resolves
  placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bet_id)      -- one placement per user per bet
);

-- ============================================================
-- Transaction ledger
-- ============================================================
CREATE TYPE tx_type AS ENUM (
  'signup_bonus',
  'daily_bonus',
  'bet_placed',
  'bet_won',
  'bet_refund',
  'admin_grant'
);

CREATE TABLE IF NOT EXISTS transactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        tx_type NOT NULL,
  amount      INTEGER NOT NULL,     -- positive = credit, negative = debit
  balance_after INTEGER NOT NULL,
  reference_id INTEGER,             -- bet_id or placement_id depending on type
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Comments on bets
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  bet_id      INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Reactions (emoji reactions on bets)
-- ============================================================
CREATE TABLE IF NOT EXISTS reactions (
  id          SERIAL PRIMARY KEY,
  bet_id      INTEGER NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       VARCHAR(8) NOT NULL,
  UNIQUE (bet_id, user_id, emoji)
);

-- ============================================================
-- Achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(64) UNIQUE NOT NULL,
  name        VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  emoji       VARCHAR(8) NOT NULL,
  condition   TEXT NOT NULL   -- human-readable description of unlock condition
);

INSERT INTO achievements (key, name, description, emoji, condition) VALUES
  ('first_bet',       'First Blood',         'Placed your first bet',                  '🩸', 'Place 1 bet'),
  ('first_win',       'Winner Winner',       'Won your first bet',                     '🏆', 'Win 1 bet'),
  ('big_spender',     'High Roller',         'Wagered 500 Schmekels in a single bet',  '💸', 'Single wager >= 500'),
  ('schmekel_rich',   'Schmekel Rich',       'Accumulated 1000 Schmekels',             '🤑', 'Balance >= 1000'),
  ('on_a_roll',       'On A Roll',           'Won 3 bets in a row',                    '🎳', '3 consecutive wins'),
  ('prophet',         'Oracle of Schmekels', 'Won 10 bets total',                      '🔮', 'Total wins >= 10'),
  ('broke',           'Dead Broke',          'Dropped to 0 Schmekels (yikes)',         '😭', 'Balance reaches 0'),
  ('creator',         'Bet Architect',       'Created 5 bets',                         '🏗️', 'Create 5 bets'),
  ('social',          'Schmekel Social',     'Commented on 10 bets',                   '💬', 'Post 10 comments'),
  ('daily_grinder',   'Daily Grinder',       'Claimed daily bonus 7 days in a row',    '📅', '7 day login streak')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_achievements (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

-- ============================================================
-- Indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bets_status       ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_creator      ON bets(creator_id);
CREATE INDEX IF NOT EXISTS idx_bets_closes_at    ON bets(closes_at);
CREATE INDEX IF NOT EXISTS idx_placements_user   ON bet_placements(user_id);
CREATE INDEX IF NOT EXISTS idx_placements_bet    ON bet_placements(bet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_bet      ON comments(bet_id);

-- ============================================================
-- Useful views
-- ============================================================
CREATE OR REPLACE VIEW bet_summary AS
SELECT
  b.*,
  c.name  AS category_name,
  c.emoji AS category_emoji,
  u.username      AS creator_name,
  u.avatar_url    AS creator_avatar,
  COALESCE(SUM(bp.amount), 0)  AS total_pool,
  COUNT(DISTINCT bp.id)        AS total_bets,
  COUNT(DISTINCT bp.user_id)   AS unique_bettors
FROM bets b
LEFT JOIN categories c ON c.id = b.category_id
LEFT JOIN users u ON u.id = b.creator_id
LEFT JOIN bet_placements bp ON bp.bet_id = b.id
GROUP BY b.id, c.name, c.emoji, u.username, u.avatar_url;
