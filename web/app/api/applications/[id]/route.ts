import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

// GET /api/applications/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);
  try {
    const [row] = await sql`
      SELECT * FROM applications WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ application: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/applications/[id] — update status, notes, job_url
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);
  try {
    const body = await req.json();
    const { status, notes, job_url, company, role, date_applied } = body;

    const [row] = await sql`
      UPDATE applications
      SET
        status       = COALESCE(${status ?? null}, status),
        notes        = COALESCE(${notes ?? null}, notes),
        job_url      = COALESCE(${job_url ?? null}, job_url),
        company      = COALESCE(${company ?? null}, company),
        role         = COALESCE(${role ?? null}, role),
        date_applied = COALESCE(${date_applied ? date_applied : null}::date, date_applied),
        updated_at   = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ application: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/applications/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);
  try {
    await sql`DELETE FROM applications WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
