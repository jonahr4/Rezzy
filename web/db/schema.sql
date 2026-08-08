-- ════════════════════════════════════════════════════
-- ResumeGenie V2 — Neon Postgres Schema
-- Run via: psql $DATABASE_URL -f schema.sql
-- ════════════════════════════════════════════════════

-- Users (mirrored from Firebase Auth for FK relationships)
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,           -- Firebase UID
  email        TEXT NOT NULL,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user resume header info
CREATE TABLE IF NOT EXISTS profiles (
  user_id   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email     TEXT,
  phone     TEXT,
  linkedin  TEXT,
  github    TEXT,
  website   TEXT,
  location  TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career entries (jobs, projects, research, volunteer)
CREATE TABLE IF NOT EXISTS entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('job', 'project', 'research', 'volunteer')),
  company    TEXT,
  title      TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date   TEXT,
  location   TEXT,
  pinned     BOOLEAN DEFAULT FALSE,
  summary    TEXT,            -- prose description for AI grounding
  skills     TEXT[],          -- skill tags
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bullet points per entry
CREATE TABLE IF NOT EXISTS bullets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id       UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  verbatim_lock  BOOLEAN DEFAULT FALSE,    -- if true, AI must use exact text
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Education
CREATE TABLE IF NOT EXISTS education (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree      TEXT NOT NULL,
  field       TEXT,
  gpa         TEXT,
  start_date  TEXT,
  end_date    TEXT,
  sort_order  INT DEFAULT 0
);

-- User's master skill list
CREATE TABLE IF NOT EXISTS skills (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- Pipeline runs
CREATE TABLE IF NOT EXISTS runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company          TEXT,
  role             TEXT,
  jd_text          TEXT NOT NULL,
  parsed_jd        JSONB,
  selected_content JSONB,
  ai_suggestions   JSONB,
  skill_rows       JSONB,
  pdf_url          TEXT,            -- Vercel Blob URL
  latex_source     TEXT,
  page_count       INT,
  retry_count      INT DEFAULT 0,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_bullets_entry ON bullets(entry_id);
CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, created_at DESC);
