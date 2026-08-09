import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  try {
    const rows = await sql`SELECT * FROM skill_groups WHERE user_id = ${userId} ORDER BY sort_order ASC, created_at ASC`;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST replaces ALL skill groups for the user (upsert by label)
export async function POST(req: NextRequest) {
  const userId = uid(req);
  const { groups } = await req.json();
  try {
    // Delete existing and reinsert (simple replace strategy)
    await sql`DELETE FROM skill_groups WHERE user_id = ${userId}`;
    const inserted = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const [row] = await sql`
        INSERT INTO skill_groups (user_id, label, skills, sort_order)
        VALUES (${userId}, ${g.label}, ${JSON.stringify(g.skills ?? [])}::jsonb, ${i})
        RETURNING *
      `;
      inserted.push(row);
    }
    return NextResponse.json(inserted);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
