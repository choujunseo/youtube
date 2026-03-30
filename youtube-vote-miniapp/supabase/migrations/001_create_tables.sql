-- ============================================================
-- Migration 001: Create Tables
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. users
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toss_user_key         BIGINT UNIQUE NOT NULL,
  display_name          TEXT NOT NULL DEFAULT '',
  free_tickets          INT NOT NULL DEFAULT 10,
  ad_tickets            INT NOT NULL DEFAULT 0,
  weekly_upload_count   INT NOT NULL DEFAULT 0,
  has_bonus_upload      BOOLEAN NOT NULL DEFAULT false,
  ticket_reset_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. weeks
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weeks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INT NOT NULL,
  week_number     INT NOT NULL,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  fever_start_at  TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'fever', 'closed', 'settled')),
  prize_pool      BIGINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, week_number)
);

-- ────────────────────────────────────────────────────────────
-- 3. ideas
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_id                 UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL CHECK (char_length(title) <= 50),
  description             TEXT NOT NULL CHECK (char_length(description) <= 500),
  thumbnail_url           TEXT,
  category                TEXT NOT NULL DEFAULT 'etc'
                            CHECK (category IN ('entertainment','education','vlog','shorts','etc')),
  total_vote_count        INT NOT NULL DEFAULT 0,
  total_weighted_shares   NUMERIC NOT NULL DEFAULT 0,
  is_boosted              BOOLEAN NOT NULL DEFAULT false,
  boost_expires_at        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. votes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id         UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  week_id         UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  weight          INT NOT NULL CHECK (weight IN (1, 2, 3)),
  weighted_share  NUMERIC NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 5. ad_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_type         TEXT NOT NULL CHECK (ad_type IN ('ticket_recharge','boost','upload_bonus')),
  ad_group_id     TEXT NOT NULL,
  reward_amount   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. weekly_results
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id           UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  winner_idea_id    UUID NOT NULL REFERENCES ideas(id),
  creator_id        UUID NOT NULL REFERENCES users(id),
  creator_prize     BIGINT NOT NULL DEFAULT 0,
  voter_winner_1_id UUID REFERENCES users(id),
  voter_winner_2_id UUID REFERENCES users(id),
  voter_prize_each  BIGINT NOT NULL DEFAULT 0,
  full_ranking      JSONB,
  settled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
