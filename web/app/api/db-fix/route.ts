// app/api/db-fix/route.ts  — one-time constraint + column type fix
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  const results: Record<string, string> = {};

  // 1. Find and drop all FK constraints on entries, education, skill_groups
  try {
    const constraints = await sql`
      SELECT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('entries', 'education', 'skill_groups')
    `;
    for (const row of constraints) {
      const name = row.constraint_name as string;
      const table = row.table_name as string;
      try {
        await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "${name}"`);
        results[`drop_${name}`] = 'ok';
      } catch (e) {
        results[`drop_${name}`] = String(e);
      }
    }
  } catch (e) { results['find_constraints'] = String(e); }

  // 2. Coerce text[] → JSONB
  const coercions: [string, string][] = [
    ['entries', 'bullets'],
    ['entries', 'skills'],
    ['entries', 'links'],
    ['education', 'relevant_coursework'],
    ['skill_groups', 'skills'],
  ];
  for (const [table, col] of coercions) {
    try {
      const [info] = await sql`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name=${table} AND column_name=${col}
      `;
      results[`${table}.${col}_type`] = info ? `${info.data_type}/${info.udt_name}` : 'missing';

      if (info && info.data_type === 'ARRAY') {
        await sql.unsafe(
          `ALTER TABLE ${table} ALTER COLUMN ${col} TYPE JSONB USING to_jsonb(${col})`
        );
        results[`${table}.${col}_coerce`] = 'ok';
      } else {
        results[`${table}.${col}_coerce`] = 'skip (not ARRAY)';
      }
    } catch (e) {
      results[`${table}.${col}_err`] = String(e);
    }
  }

  // 3. Drop NOT NULL on nullable columns
  const dropNotNulls: [string, string][] = [
    ['entries', 'start_date'], ['entries', 'end_date'], ['entries', 'location'],
    ['entries', 'organization'], ['entries', 'summary'],
    ['education', 'minor'], ['education', 'location'], ['education', 'start_date'],
    ['education', 'end_date'], ['education', 'gpa'], ['education', 'honors'],
  ];
  for (const [table, col] of dropNotNulls) {
    try {
      await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN ${col} DROP NOT NULL`);
      results[`${table}.${col}_notnull`] = 'dropped';
    } catch (e) {
      results[`${table}.${col}_notnull`] = `skip: ${String(e).slice(0, 60)}`;
    }
  }

  // 4. Add relevant_coursework to education if missing
  try {
    await sql.unsafe(`ALTER TABLE education ADD COLUMN IF NOT EXISTS relevant_coursework JSONB NOT NULL DEFAULT '[]'`);
    results['education.relevant_coursework_add'] = 'ok';
  } catch (e) { results['education.relevant_coursework_add'] = String(e); }

  return NextResponse.json(results);
}
