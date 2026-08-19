import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { put, get } from '@vercel/blob';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id')
    ?? req.nextUrl.searchParams.get('uid')
    ?? 'dev-user';
}

// POST — upload PDF to Vercel Blob (private), save pathname + base64 fallback to DB
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const userId = uid(req);
  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) return NextResponse.json({ error: 'pdf_base64 required' }, { status: 400 });

    const pdfBytes = Buffer.from(pdf_base64, 'base64');
    const filename = `resumes/${userId}/${runId}.pdf`;

    let blobPathname: string | null = null;
    try {
      const blob = await put(filename, pdfBytes, {
        access: 'private',
        contentType: 'application/pdf',
      });
      blobPathname = blob.pathname;
      console.log('Blob uploaded:', blob.pathname, blob.url);
    } catch (blobErr) {
      console.error('Blob upload failed:', blobErr);
    }

    // Always save base64 as fallback, and blob pathname if upload succeeded
    await sql`
      UPDATE pipeline_runs
      SET
        pdf_base64 = ${pdf_base64},
        pdf_url    = ${blobPathname},
        updated_at = now()
      WHERE id = ${runId}::uuid AND user_id = ${userId}
    `;

    return NextResponse.json({ ok: true, blob_pathname: blobPathname });
  } catch (e) {
    console.error('PDF save error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET — serve PDF: try Blob first, fall back to base64 from DB
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const userId = uid(req);

  try {
    const rows = await sql`
      SELECT pdf_url, pdf_base64 FROM pipeline_runs
      WHERE id = ${runId}::uuid AND user_id = ${userId}
    `;
    if (!rows.length) return new NextResponse('Not found', { status: 404 });

    const { pdf_url, pdf_base64 } = rows[0];

    // Try Vercel Blob first (pdf_url stores the pathname)
    if (pdf_url) {
      try {
        const result = await get(pdf_url, { access: 'private' });
        if (result) {
          return new NextResponse(result.stream, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'inline; filename="resume.pdf"',
              'Cache-Control': 'private, max-age=3600',
              'X-Frame-Options': 'SAMEORIGIN',
            },
          });
        }
      } catch (blobErr) {
        console.error('Blob GET failed, falling back to base64:', blobErr);
      }
    }

    // Fallback: serve from base64 in DB
    if (!pdf_base64) return new NextResponse('No PDF available', { status: 404 });

    const pdfBytes = Buffer.from(pdf_base64, 'base64');
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="resume.pdf"',
        'Cache-Control': 'private, max-age=3600',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
