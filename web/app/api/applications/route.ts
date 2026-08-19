import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { put } from '@vercel/blob';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  try {
    const rows = await sql`
      SELECT id, company, role, job_url, date_applied, status, notes, pdf_blob_url, run_id,
             jd_text, jd_summary, jd_skills, parsed_jd, created_at, updated_at
      FROM applications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ applications: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = uid(req);
  try {
    const body = await req.json();
    const {
      company, role, job_url, date_applied, status,
      notes, pdf_base64, jd_text, parsed_jd, skill_rows, run_id
    } = body;

    if (!company || !role) {
      return NextResponse.json({ error: 'company and role are required' }, { status: 400 });
    }

    const jd_skills = parsed_jd?.skills ?? parsed_jd?.required_skills ?? [];
    const jd_summary = parsed_jd?.summary ?? parsed_jd?.description ?? null;

    // Upload PDF to Vercel Blob (private)
    let pdf_blob_url: string | null = null;
    if (pdf_base64) {
      try {
        const pdfBytes = Buffer.from(pdf_base64, 'base64');
        const safeCo = company.replace(/[^a-zA-Z0-9]/g, '-');
        const filename = `resumes/${userId}/${safeCo}-${Date.now()}.pdf`;
        const blob = await put(filename, pdfBytes, {
          access: 'private',
          contentType: 'application/pdf',
        });
        pdf_blob_url = blob.pathname;
      } catch (e) {
        console.error('Blob upload error:', e);
      }
    }

    const [row] = await sql`
      INSERT INTO applications (
        user_id, company, role, job_url, date_applied, status,
        notes, pdf_blob_url, run_id, jd_text, jd_summary, jd_skills, parsed_jd, skill_rows
      )
      VALUES (
        ${userId}, ${company}, ${role},
        ${job_url || null},
        ${date_applied || new Date().toISOString().split('T')[0]},
        ${status || 'applied'},
        ${notes || null},
        ${pdf_blob_url},
        ${run_id || null},
        ${jd_text || null},
        ${jd_summary},
        ${JSON.stringify(jd_skills)}::jsonb,
        ${parsed_jd ? JSON.stringify(parsed_jd) : null}::jsonb,
        ${skill_rows ? JSON.stringify(skill_rows) : null}::jsonb
      )
      RETURNING *
    `;

    return NextResponse.json({ application: row }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
