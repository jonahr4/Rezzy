import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  try {
    const rows = await sql`SELECT * FROM education WHERE user_id = ${userId} ORDER BY start_date DESC`;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = uid(req);
  const body = await req.json();
  const { institution, degree, minor, location, start_date, end_date, gpa, honors, relevant_coursework } = body;
  try {
    const [row] = await sql`
      INSERT INTO education (user_id, institution, degree, minor, location, start_date, end_date, gpa, honors, relevant_coursework)
      VALUES (${userId}, ${institution}, ${degree}, ${minor ?? null}, ${location ?? null},
              ${start_date ?? null}, ${end_date ?? null}, ${gpa ?? null}, ${honors ?? null},
              ${JSON.stringify(relevant_coursework ?? [])}::jsonb)
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
