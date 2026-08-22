import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import OpenAI from 'openai';
import crypto from 'crypto';

function uid(req: NextRequest) {
  return req.headers.get('x-user-id') ?? 'dev-user';
}

function getOpenAI() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
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

const SYSTEM_PROMPT = `You are a professional resume writer with deep ATS optimization expertise. 
Your task is to take a raw summary of an individual's experience at a job or project, and extract/generate 2-4 professional resume bullet points.

CRITICAL RULES:
1. ONLY extract information present in or heavily implied by the summary. Do NOT hallucinate metrics or responsibilities.
2. Follow the XYZ formula: [Action verb] + [what they did] + [metric/scale if available] + [technology if available].
3. Bullets must start with a strong action verb (Engineered, Architected, Developed, Spearheaded, Reduced, etc).
4. Each bullet should be 15-25 words long.
5. Return ONLY a valid JSON object matching the format requested. No markdown, no conversational text.

Expected JSON output format:
{
  "bullets": [
    "Spearheaded the development of a highly scalable...",
    "Reduced processing time by 40% through..."
  ]
}`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = uid(req);

  try {
    // 1. Fetch the entry
    const rows = await sql`SELECT * FROM entries WHERE id = ${id} AND user_id = ${userId}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    const entry = rows[0];

    // 2. Validate summary length
    const summary = (entry.summary || '').trim();
    if (summary.split(/\s+/).length < 10) {
      return NextResponse.json(
        { error: 'Summary is too short. Please add more details to generate accurate bullet points.' },
        { status: 400 }
      );
    }

    // 3. Call LLM
    const openai = getOpenAI();
    const prompt = `Title: ${entry.title}
Organization: ${entry.organization || 'N/A'}
Summary:
${summary}`;
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0].message.content || '{}';
    let newBulletTexts: string[] = [];
    try {
      const parsed = JSON.parse(responseContent);
      newBulletTexts = parsed.bullets || [];
    } catch (e) {
      console.error('Failed to parse LLM response', e);
      return NextResponse.json({ error: 'Failed to generate bullets correctly.' }, { status: 500 });
    }

    if (newBulletTexts.length === 0) {
      return NextResponse.json({ error: 'AI returned 0 bullets.' }, { status: 500 });
    }

    // 4. Append to existing bullets
    const existingBullets = Array.isArray(entry.bullets) ? entry.bullets : [];
    const newBullets = newBulletTexts.map(text => ({
      id: `${id}_b_${crypto.randomBytes(4).toString('hex')}`,
      text: text.trim()
    }));
    
    const combinedBullets = [...existingBullets, ...newBullets];

    // 5. Update Database
    const [updatedRow] = await sql`
      UPDATE entries SET
        bullets = ${JSON.stringify(combinedBullets)}::jsonb,
        updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    return NextResponse.json(updatedRow);
  } catch (e: unknown) {
    console.error('generate-bullets error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}