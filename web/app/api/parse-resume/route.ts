// Polyfill for Math.sumPrecise (used by unpdf/pdfjs on older Node versions)
if (typeof (Math as any).sumPrecise !== 'function') {
  (Math as any).sumPrecise = function (values: Iterable<number>) {
    let sum = 0;
    for (const v of values) {
      sum += v;
    }
    return sum;
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import OpenAI from 'openai';
import { extractText } from 'unpdf';

/* ── OpenAI-compatible client pointing at OpenRouter (not OpenAI) ── */
function getOpenAI() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY env var is not set. Add it in Vercel → Settings → Environment Variables.');
  return new OpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://rezzy.app',
      'X-Title': 'Rezzy',
    },
  });
}
const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite';

/* ── Types ── */
export interface ParsedBullet { id: string; text: string; }
export interface ParsedEntry {
  type: 'job' | 'project';
  title: string;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  summary: string | null;
  bullets: ParsedBullet[];
  skills: string[];
}
export interface ParsedEducation {
  institution: string;
  degree: string;
  minor: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | null;
  honors: string | null;
  relevant_coursework: string[];
}

export interface MergeEntry {
  existing_id: string;
  existing_title: string;
  existing_org: string | null;
  new_bullets: ParsedBullet[];
  new_skills: string[];
}

export interface ResumeParseResult {
  entries: ParsedEntry[];
  education: ParsedEducation[];
  skills: string[];
  new_entries: ParsedEntry[];
  merge_entries: MergeEntry[];
  duplicate_entries: ParsedEntry[];
  new_education: ParsedEducation[];
  duplicate_education: ParsedEducation[];
  new_skills: string[];
  duplicate_skills: string[];
}

/* ── Fuzzy similarity (word overlap ratio) ── */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return (overlap * 2) / (wordsA.size + wordsB.size);
}

function isDuplicateBullet(newBullet: string, existingBullets: string[]): boolean {
  return existingBullets.some(b => similarity(newBullet, b) > 0.65);
}

interface ExistingEntry {
  id: string;
  title: string;
  organization: string | null;
  bullets: ParsedBullet[];
  skills: unknown;
}

function findMatchingEntry(incoming: ParsedEntry, existing: ExistingEntry[]): ExistingEntry | null {
  return existing.find(e =>
    similarity(incoming.title, e.title) > 0.8 &&
    (!incoming.organization || !e.organization || similarity(incoming.organization, e.organization) > 0.7)
  ) ?? null;
}

function isDuplicateEdu(incoming: ParsedEducation, existing: { institution: string; degree: string }[]): boolean {
  return existing.some(e =>
    similarity(incoming.institution, e.institution) > 0.8 &&
    similarity(incoming.degree, e.degree) > 0.7
  );
}

/* ── Main handler ── */
export async function POST(req: NextRequest) {
  const uid = req.headers.get('x-user-id') ?? 'dev-user';

  try {
    const formData = await req.formData();

    // Collect all PDF files (multi-upload support, up to 5)
    const files: File[] = [];
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.name.toLowerCase().endsWith('.pdf')) {
        files.push(value);
      }
    }
    if (files.length === 0) {
      return NextResponse.json({ error: 'No PDF files provided' }, { status: 400 });
    }
    if (files.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 PDFs at once' }, { status: 400 });
    }

    // 1. Extract text from all PDFs and concatenate
    const textParts: string[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      if (text && text.length > 20) {
        textParts.push(text);
      }
    }
    const resumeText = textParts.join('\n\n--- Next Resume ---\n\n');
    if (resumeText.length < 50) {
      return NextResponse.json({ error: 'Could not extract text from PDF(s). Try text-based PDFs.' }, { status: 422 });
    }

    // 2. Call OpenRouter to parse structured resume data
    const prompt = `You are a resume parser. Extract ALL structured data from this resume text.
There may be content from multiple resumes — deduplicate entries that are clearly the same role
(same company + similar title) by keeping the most complete version with ALL unique bullet points combined.

Return ONLY valid JSON matching this schema exactly:
{
  "entries": [
    {
      "type": "job" | "project",
      "title": "string (role title or project name)",
      "organization": "string or null (company name, null for personal projects)",
      "start_date": "string or null (e.g. 'Jun 2024')",
      "end_date": "string or null (e.g. 'Aug 2024' or 'Present')",
      "location": "string or null",
      "summary": "string or null (brief description if present)",
      "bullets": [{"id": "unique_id", "text": "bullet point text"}],
      "skills": ["skill1", "skill2"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string (full degree name)",
      "minor": "string or null",
      "location": "string or null",
      "start_date": "string or null",
      "end_date": "string or null",
      "gpa": "string or null",
      "honors": "string or null",
      "relevant_coursework": ["course1", "course2"]
    }
  ],
  "skills": ["flat list of ALL skills mentioned anywhere on the resume"]
}

Rules:
- Include EVERY bullet point verbatim — do not paraphrase or summarize
- If two entries are the same role at the same company, merge them into one entry with all unique bullets combined
- Jobs = work experience, internships, research roles
- Projects = personal, course, or team projects
- skills[] at top level = all unique skills from the whole document
- Generate unique IDs for bullets like "b1", "b2", etc.
- Return ONLY the JSON, no markdown, no explanation

Resume:
---
${resumeText.slice(0, 16000)}
---`;

    const completion = await getOpenAI().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: { entries?: ParsedEntry[]; education?: ParsedEducation[]; skills?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'LLM returned invalid JSON', raw }, { status: 502 });
    }

    const incomingEntries: ParsedEntry[] = (parsed.entries ?? []).map((e, i) => ({
      ...e,
      bullets: (e.bullets ?? []).map((b, j) => ({ id: b.id || `b${i}_${j}`, text: b.text })),
      skills: e.skills ?? [],
      type: e.type === 'project' ? 'project' : 'job',
    }));
    const incomingEducation: ParsedEducation[] = parsed.education ?? [];
    const incomingSkills: string[] = parsed.skills ?? [];

    // 3. Fetch existing data from Neon for duplicate/merge detection
    const [existingEntries, existingEdu, existingSkillGroups] = await Promise.all([
      sql`SELECT id, title, organization, bullets, skills FROM entries WHERE user_id = ${uid}`,
      sql`SELECT institution, degree FROM education WHERE user_id = ${uid}`,
      sql`SELECT skills FROM skill_groups WHERE user_id = ${uid}`,
    ]);

    const typedExisting = existingEntries as unknown as ExistingEntry[];
    const allExistingBullets: string[] = typedExisting.flatMap(
      (e) => (Array.isArray(e.bullets) ? e.bullets : []).map((b: ParsedBullet) => b.text)
    );
    const existingSkillSet = new Set<string>(
      existingSkillGroups.flatMap(g => (g.skills as string[]).map(s => s.toLowerCase()))
    );

    // 4. Categorize entries: new / merge / duplicate
    const new_entries: ParsedEntry[] = [];
    const merge_entries: MergeEntry[] = [];
    const duplicate_entries: ParsedEntry[] = [];

    for (const entry of incomingEntries) {
      const match = findMatchingEntry(entry, typedExisting);
      if (match) {
        // Same entry exists — check for new bullets
        const existingBulletTexts = (Array.isArray(match.bullets) ? match.bullets : []).map((b: ParsedBullet) => b.text);
        const existingSkillList = Array.isArray(match.skills) ? (match.skills as string[]) : [];
        const newBullets = entry.bullets.filter(b => !isDuplicateBullet(b.text, existingBulletTexts));
        const newSkills = entry.skills.filter(s =>
          !existingSkillList.some(es => es.toLowerCase() === s.toLowerCase())
        );

        if (newBullets.length > 0 || newSkills.length > 0) {
          // Has new content to merge
          merge_entries.push({
            existing_id: match.id,
            existing_title: match.title,
            existing_org: match.organization,
            new_bullets: newBullets,
            new_skills: newSkills,
          });
        } else {
          // Pure duplicate — nothing new
          duplicate_entries.push(entry);
        }
      } else {
        // Brand new entry — still filter bullets against ALL existing bullets
        const freshBullets = entry.bullets.filter(b => !isDuplicateBullet(b.text, allExistingBullets));
        new_entries.push({ ...entry, bullets: freshBullets.length > 0 ? freshBullets : entry.bullets });
      }
    }

    // 5. Deduplicate education
    const new_education = incomingEducation.filter(e =>
      !isDuplicateEdu(e, existingEdu as { institution: string; degree: string }[])
    );
    const duplicate_education = incomingEducation.filter(e =>
      isDuplicateEdu(e, existingEdu as { institution: string; degree: string }[])
    );

    // 6. Deduplicate skills
    const new_skills = incomingSkills.filter(s => !existingSkillSet.has(s.toLowerCase()));
    const duplicate_skills = incomingSkills.filter(s => existingSkillSet.has(s.toLowerCase()));

    const result: ResumeParseResult = {
      entries: incomingEntries,
      education: incomingEducation,
      skills: incomingSkills,
      new_entries,
      merge_entries,
      duplicate_entries,
      new_education,
      duplicate_education,
      new_skills,
      duplicate_skills,
    };

    return NextResponse.json(result);
  } catch (e: unknown) {
    console.error('parse-resume error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
