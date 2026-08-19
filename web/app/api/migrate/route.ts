// app/api/migrate/route.ts — idempotent schema setup
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    // Drop FK constraints that block inserts with Firebase UIDs
    await sql`
      DO $$ BEGIN
        ALTER TABLE entries    DROP CONSTRAINT IF EXISTS entries_user_id_fkey;
        ALTER TABLE education  DROP CONSTRAINT IF EXISTS education_user_id_fkey;
        ALTER TABLE skill_groups DROP CONSTRAINT IF EXISTS skill_groups_user_id_fkey;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `;

    // ── entries ─────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT NOT NULL,
        type         TEXT NOT NULL,
        title        TEXT NOT NULL,
        organization TEXT,
        start_date   TEXT,
        end_date     TEXT,
        location     TEXT,
        pinned       BOOLEAN NOT NULL DEFAULT false,
        summary      TEXT,
        bullets      JSONB NOT NULL DEFAULT '[]',
        skills       JSONB NOT NULL DEFAULT '[]',
        links        JSONB NOT NULL DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Add missing scalar columns (safe no-ops if exist)
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS organization TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS start_date   TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS end_date     TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS location     TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS summary      TEXT`;
    await sql`ALTER TABLE entries ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()`;

    // Coerce text[] → JSONB for bullets / skills / links
    await sql`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='entries' AND column_name='bullets') = 'ARRAY' THEN
          ALTER TABLE entries ALTER COLUMN bullets TYPE JSONB USING to_jsonb(bullets);
        END IF;
      END $$
    `;
    await sql`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='entries' AND column_name='skills') = 'ARRAY' THEN
          ALTER TABLE entries ALTER COLUMN skills TYPE JSONB USING to_jsonb(skills);
        END IF;
      END $$
    `;
    await sql`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='entries' AND column_name='links') IS NULL THEN
          ALTER TABLE entries ADD COLUMN links JSONB NOT NULL DEFAULT '{}';
        END IF;
      END $$
    `;
    await sql`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='entries' AND column_name='pinned') IS NULL THEN
          ALTER TABLE entries ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$
    `;

    // ── education ───────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS education (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             TEXT NOT NULL,
        institution         TEXT NOT NULL,
        degree              TEXT NOT NULL,
        minor               TEXT,
        location            TEXT,
        start_date          TEXT,
        end_date            TEXT,
        gpa                 TEXT,
        honors              TEXT,
        relevant_coursework JSONB NOT NULL DEFAULT '[]',
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='education' AND column_name='relevant_coursework') = 'ARRAY' THEN
          ALTER TABLE education ALTER COLUMN relevant_coursework TYPE JSONB USING to_jsonb(relevant_coursework);
        END IF;
      END $$
    `;

    // ── skill_groups ─────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS skill_groups (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT NOT NULL,
        label       TEXT NOT NULL,
        skills      JSONB NOT NULL DEFAULT '[]',
        sort_order  INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name='skill_groups' AND column_name='skills') = 'ARRAY' THEN
          ALTER TABLE skill_groups ALTER COLUMN skills TYPE JSONB USING to_jsonb(skills);
        END IF;
      END $$
    `;

    await sql`CREATE INDEX IF NOT EXISTS entries_user_idx   ON entries      (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS education_user_idx ON education    (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS skillgrp_user_idx  ON skill_groups (user_id)`;

    // ── profiles (personal info for LaTeX header) ──────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT NOT NULL UNIQUE,
        full_name   TEXT NOT NULL DEFAULT '',
        phone       TEXT NOT NULL DEFAULT '',
        email       TEXT NOT NULL DEFAULT '',
        website     TEXT NOT NULL DEFAULT '',
        linkedin    TEXT NOT NULL DEFAULT '',
        github      TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // ── pipeline_runs ──────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_runs (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           TEXT NOT NULL,
        company           TEXT,
        role              TEXT,
        jd_text           TEXT NOT NULL,
        parsed_jd         JSONB,
        confirmed_entries JSONB,
        selected_content  JSONB,
        ai_suggestions    JSONB,
        skill_rows        JSONB,
        pdf_url           TEXT,
        latex_source      TEXT,
        page_count        INT,
        retry_count       INT DEFAULT 0,
        status            TEXT NOT NULL DEFAULT 'running',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS pipeline_runs_user_idx ON pipeline_runs (user_id, created_at DESC)`;

    // ── applications ───────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       TEXT NOT NULL,
        company       TEXT NOT NULL,
        role          TEXT NOT NULL,
        job_url       TEXT,
        date_applied  DATE NOT NULL DEFAULT CURRENT_DATE,
        status        TEXT NOT NULL DEFAULT 'need_to_apply',
        notes         TEXT,
        pdf_blob_url  TEXT,
        jd_text       TEXT,
        jd_summary    TEXT,
        jd_skills     JSONB NOT NULL DEFAULT '[]',
        parsed_jd     JSONB,
        skill_rows    JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS applications_user_idx ON applications (user_id, created_at DESC)`;
    await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS jd_summary TEXT`;
    await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS jd_skills JSONB NOT NULL DEFAULT '[]'`;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('Migration error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
