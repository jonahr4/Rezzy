// GET /api/pipeline/[runId] — fetch a run
// PATCH /api/pipeline/[runId] — update run with step outputs
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const userId = uid(req);
  const { runId } = await params;
  try {
    const rows = await sql`
      SELECT * FROM pipeline_runs WHERE id = ${runId}::uuid AND user_id = ${userId}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const userId = uid(req);
  const { runId } = await params;
  const body = await req.json();

  try {
    // Update only the fields that are provided
    const rows = await sql`
      UPDATE pipeline_runs SET
        company           = COALESCE(${body.company ?? null}, company),
        role              = COALESCE(${body.role ?? null}, role),
        parsed_jd         = COALESCE(${body.parsed_jd ? JSON.stringify(body.parsed_jd) : null}::jsonb, parsed_jd),
        confirmed_entries = COALESCE(${body.confirmed_entries ? JSON.stringify(body.confirmed_entries) : null}::jsonb, confirmed_entries),
        selected_content  = COALESCE(${body.selected_content ? JSON.stringify(body.selected_content) : null}::jsonb, selected_content),
        ai_suggestions    = COALESCE(${body.ai_suggestions ? JSON.stringify(body.ai_suggestions) : null}::jsonb, ai_suggestions),
        skill_rows        = COALESCE(${body.skill_rows ? JSON.stringify(body.skill_rows) : null}::jsonb, skill_rows),
        pdf_url           = COALESCE(${body.pdf_url ?? null}, pdf_url),
        latex_source      = COALESCE(${body.latex_source ?? null}, latex_source),
        page_count        = COALESCE(${body.page_count ?? null}::int, page_count),
        retry_count       = COALESCE(${body.retry_count ?? null}::int, retry_count),
        status            = COALESCE(${body.status ?? null}, status),
        updated_at        = now()
      WHERE id = ${runId}::uuid AND user_id = ${userId}
      RETURNING *
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
