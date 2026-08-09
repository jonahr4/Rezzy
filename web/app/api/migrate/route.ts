// app/api/migrate/route.ts — run once to create tables
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT NOT NULL,
        type        TEXT NOT NULL CHECK (type IN ('job','project')),
        title       TEXT NOT NULL,
        organization TEXT,
        start_date  TEXT,
        end_date    TEXT,
        location    TEXT,
        pinned      BOOLEAN NOT NULL DEFAULT false,
        summary     TEXT,
        bullets     JSONB NOT NULL DEFAULT '[]',
        skills      JSONB NOT NULL DEFAULT '[]',
        links       JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

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

    await sql`CREATE INDEX IF NOT EXISTS entries_user_idx    ON entries    (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS education_user_idx  ON education  (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS skillgrp_user_idx   ON skill_groups (user_id)`;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('Migration error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
