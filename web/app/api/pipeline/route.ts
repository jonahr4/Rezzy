// POST /api/pipeline — create a new pipeline run
// GET /api/pipeline — list runs for the user
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function POST(req: NextRequest) {
  const userId = uid(req);
  const body = await req.json();
  const { jd_text } = body;

  if (!jd_text || typeof jd_text !== 'string') {
    return NextResponse.json({ error: 'jd_text is required' }, { status: 400 });
  }

  try {
    const rows = await sql`
      INSERT INTO pipeline_runs (user_id, jd_text, status)
      VALUES (${userId}, ${jd_text}, 'running')
      RETURNING id, status, created_at
    `;
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  try {
    const rows = await sql`
      SELECT id, company, role, status, page_count, retry_count, pdf_url, created_at
      FROM pipeline_runs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
