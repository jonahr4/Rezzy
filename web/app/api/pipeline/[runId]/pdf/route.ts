// POST /api/pipeline/[runId]/pdf — save base64 PDF to DB
// GET  /api/pipeline/[runId]/pdf — serve PDF bytes from DB
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  // Accept header OR query param (needed for iframe src which can't send headers)
  return req.headers.get('x-user-id')
    ?? req.nextUrl.searchParams.get('uid')
    ?? 'dev-user';
}

// Save base64 PDF to pipeline_runs.pdf_base64
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const userId = uid(req);
  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) return NextResponse.json({ error: 'pdf_base64 required' }, { status: 400 });

    await sql`
      UPDATE pipeline_runs
      SET pdf_base64 = ${pdf_base64}, updated_at = now()
      WHERE id = ${runId}::uuid AND user_id = ${userId}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PDF save error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Stream PDF bytes from DB — works anywhere (local dev + production)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const userId = uid(req);
  try {
    const rows = await sql`
      SELECT pdf_base64 FROM pipeline_runs
      WHERE id = ${runId}::uuid AND user_id = ${userId}
    `;
    if (!rows.length || !rows[0].pdf_base64) {
      return NextResponse.json({ error: 'No PDF available' }, { status: 404 });
    }
    const pdfBytes = Buffer.from(rows[0].pdf_base64, 'base64');
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="resume.pdf"',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
