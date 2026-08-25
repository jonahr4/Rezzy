import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const API_BASE = process.env.PIPELINE_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_ACA_URL || "http://127.0.0.1:5001";

/**
 * Fetch the authenticated user's source bank from the database.
 * Returns the same shape as V1/data/source_bank.json but per-user.
 */
async function fetchUserSourceBank(userId: string) {
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
    tagline: (e.tagline as string) ?? '',
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

  return {
    personal,
    entries,
    education,
    skills: [...new Set(skills)],
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { step, ...payload } = body;
  const userId = req.headers.get("x-user-id") ?? "dev-user";

  const stepMap: Record<string, string> = {
    "parse-jd": "/step/parse-jd",
    skills: "/step/skills",
    "select-entries": "/step/select-entries",
    "select-bullets": "/step/select-bullets",
    suggest: "/step/suggest",
    compile: "/step/compile",
  };

  const endpoint = stepMap[step];
  if (!endpoint) {
    return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 });
  }

  try {
    // Fetch user's source bank from DB and inject it into the payload
    const sourceBank = await fetchUserSourceBank(userId);

    // Check if user has any data — if not, block the pipeline
    if (sourceBank.entries.length === 0) {
      return NextResponse.json(
        { error: "no_source_data", message: "You need to add your experience and projects before tailoring." },
        { status: 422 }
      );
    }

    const enrichedPayload = {
      ...payload,
      source_bank: sourceBank,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enrichedPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Pipeline API error: ${errText}` },
        { status: res.status }
      );
    }

    // For compile step, proxy the SSE stream directly through
    if (step === "compile" && res.body) {
      return new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Pipeline API unreachable. Is uvicorn running on port 5001? ${err}` },
      { status: 502 }
    );
  }
}
