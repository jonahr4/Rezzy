import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);
  const body = await req.json();
  try {
    const [row] = await sql`
      UPDATE education SET
        institution         = COALESCE(${body.institution ?? null}, institution),
        degree              = COALESCE(${body.degree ?? null}, degree),
        minor               = COALESCE(${body.minor ?? null}, minor),
        location            = COALESCE(${body.location ?? null}, location),
        start_date          = COALESCE(${body.start_date ?? null}, start_date),
        end_date            = COALESCE(${body.end_date ?? null}, end_date),
        gpa                 = COALESCE(${body.gpa ?? null}, gpa),
        honors              = COALESCE(${body.honors ?? null}, honors),
        relevant_coursework = COALESCE(${body.relevant_coursework != null ? JSON.stringify(body.relevant_coursework) : null}::jsonb, relevant_coursework),
        updated_at          = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);
  try {
    await sql`DELETE FROM education WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
