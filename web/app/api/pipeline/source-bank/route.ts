// GET /api/pipeline/source-bank — assemble full source bank for the Python pipeline
// Converts DB entries/education/skills into V1 format
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

export async function GET(req: NextRequest) {
  const userId = uid(req);
  try {
    // Fetch profile (personal info)
    const profileRows = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    const profile = profileRows[0] || {};
    const personal = {
      name: profile.full_name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      website: profile.website || '',
      linkedin: profile.linkedin || '',
      github: profile.github || '',
    };

    // Fetch entries
    const entryRows = await sql`
      SELECT * FROM entries WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    const entries = entryRows.map((e: Record<string, unknown>) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      company: e.organization,
      start_date: e.start_date || '',
      end_date: e.end_date || 'Present',
      location: e.location || '',
      pinned: e.pinned || false,
      summary: e.summary || '',
      tagline: row.tagline ?? '',
      links: typeof e.links === 'string' ? JSON.parse(e.links) : (e.links || {}),
      skills: typeof e.skills === 'string' ? JSON.parse(e.skills) : (e.skills || []),
      bullets: (typeof e.bullets === 'string' ? JSON.parse(e.bullets) : (e.bullets || [])).map(
        (b: { id?: string; text: string }, idx: number) => ({
          id: b.id || `${e.id}_b${idx}`,
          text: b.text,
        })
      ),
    }));

    // Fetch education
    const eduRows = await sql`
      SELECT * FROM education WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    const education = eduRows.map((ed: Record<string, unknown>) => ({
      institution: ed.institution,
      degree: ed.degree,
      minor: ed.minor || '',
      location: ed.location || '',
      start_date: ed.start_date || '',
      end_date: ed.end_date || '',
      gpa: ed.gpa || '',
      honors: ed.honors || '',
      relevant_coursework: typeof ed.relevant_coursework === 'string'
        ? JSON.parse(ed.relevant_coursework) : (ed.relevant_coursework || []),
    }));

    // Fetch skills (flat list from skill_groups)
    const skillRows = await sql`
      SELECT skills FROM skill_groups WHERE user_id = ${userId} ORDER BY sort_order
    `;
    const skills: string[] = [];
    for (const row of skillRows) {
      const parsed = typeof row.skills === 'string' ? JSON.parse(row.skills) : (row.skills || []);
      skills.push(...parsed);
    }

    return NextResponse.json({
      personal,
      entries,
      education,
      skills: [...new Set(skills)], // deduplicate
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
