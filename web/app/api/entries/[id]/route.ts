import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);
  const body = await req.json();
  const { type, title, organization, start_date, end_date, location, pinned, summary, tagline, bullets, skills, links } = body;
  try {
    const [row] = await sql`
      UPDATE entries SET
        type         = COALESCE(${type ?? null}, type),
        title        = COALESCE(${title ?? null}, title),
        organization = COALESCE(${organization ?? null}, organization),
        start_date   = COALESCE(${start_date ?? null}, start_date),
        end_date     = COALESCE(${end_date ?? null}, end_date),
        location     = COALESCE(${location ?? null}, location),
        pinned       = COALESCE(${pinned ?? null}, pinned),
        summary      = COALESCE(${summary ?? null}, summary),
        bullets      = COALESCE(${bullets != null ? JSON.stringify(bullets) : null}::jsonb, bullets),
        skills       = COALESCE(${skills != null ? JSON.stringify(skills) : null}::jsonb, skills),
        links        = COALESCE(${links != null ? JSON.stringify(links) : null}::jsonb, links),
        updated_at   = now()
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
    await sql`DELETE FROM entries WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
