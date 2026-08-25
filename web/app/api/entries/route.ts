import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  const type = req.nextUrl.searchParams.get('type');
  try {
    const rows = type
      ? await sql`SELECT * FROM entries WHERE user_id = ${userId} AND type = ${type} ORDER BY pinned DESC, created_at DESC`
      : await sql`SELECT * FROM entries WHERE user_id = ${userId} ORDER BY pinned DESC, created_at DESC`;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = uid(req);
  const body = await req.json();
  const { type, title, organization, start_date, end_date, location, pinned, summary, tagline, bullets, skills, links } = body;
  try {
    const [row] = await sql`
      INSERT INTO entries (user_id, type, title, organization, start_date, end_date, location, pinned, summary, tagline, bullets, skills, links)
      VALUES (${userId}, ${type}, ${title}, ${organization ?? null}, ${start_date ?? null}, ${end_date ?? null},
              ${location ?? null}, ${pinned ?? false}, ${summary ?? null}, ${tagline ?? null},
              ${JSON.stringify(bullets ?? [])}::jsonb,
              ${JSON.stringify(skills ?? [])}::jsonb,
              ${JSON.stringify(links ?? {})}::jsonb)
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
