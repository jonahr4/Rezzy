import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

const CHAR_LIMITS: Record<string, number> = {
  full_name: 60,
  phone: 20,
  email: 80,
  website: 80,
  linkedin: 80,
  github: 80,
};

export async function GET(req: NextRequest) {
  const userId = uid(req);
  try {
    const rows = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    if (rows.length === 0) {
      return NextResponse.json({
        full_name: '', phone: '', email: '', website: '', linkedin: '', github: '',
      });
    }
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = uid(req);
  const body = await req.json();
  const { full_name, phone, email, website, linkedin, github, location } = body;

  // Enforce character limits
  for (const [field, limit] of Object.entries(CHAR_LIMITS)) {
    const val = body[field];
    if (typeof val === 'string' && val.length > limit) {
      return NextResponse.json(
        { error: `${field} exceeds ${limit} character limit` },
        { status: 400 }
      );
    }
  }

  try {
    const rows = await sql`
      INSERT INTO profiles (user_id, full_name, phone, email, website, linkedin, github, location)
      VALUES (${userId}, ${full_name ?? ''}, ${phone ?? ''}, ${email ?? ''},
              ${website ?? ''}, ${linkedin ?? ''}, ${github ?? ''}, ${location ?? ''})
      ON CONFLICT (user_id) DO UPDATE SET
        full_name  = COALESCE(${full_name ?? null}, profiles.full_name),
        phone      = COALESCE(${phone ?? null}, profiles.phone),
        email      = COALESCE(${email ?? null}, profiles.email),
        website    = COALESCE(${website ?? null}, profiles.website),
        linkedin   = COALESCE(${linkedin ?? null}, profiles.linkedin),
        github     = COALESCE(${github ?? null}, profiles.github),
        location   = COALESCE(${location ?? null}, profiles.location),
        updated_at = now()
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
