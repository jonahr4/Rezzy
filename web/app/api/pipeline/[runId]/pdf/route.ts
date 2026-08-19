// POST /api/pipeline/[runId]/pdf — upload base64 PDF to Vercel Blob, save url to pipeline_runs
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { put } from '@vercel/blob';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const userId = uid(req);

  try {
    const { pdf_base64, company, role } = await req.json();
    if (!pdf_base64) {
      return NextResponse.json({ error: 'pdf_base64 required' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const pdfBytes = Buffer.from(pdf_base64, 'base64');
    const safeName = [company, role, runId.slice(0, 8)]
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .slice(0, 80);
    const filename = `runs/${userId}/${safeName}.pdf`;

    const blob = await put(filename, pdfBytes, {
      access: 'public',
      contentType: 'application/pdf',
    });

    // Save blob URL to pipeline_runs
    await sql`
      UPDATE pipeline_runs
      SET pdf_url = ${blob.url}, updated_at = now()
      WHERE id = ${runId}::uuid AND user_id = ${userId}
    `;

    return NextResponse.json({ pdf_url: blob.url });
  } catch (e) {
    console.error('PDF upload error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
