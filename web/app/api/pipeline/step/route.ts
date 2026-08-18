import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.PIPELINE_API_URL || process.env.NEXT_PUBLIC_ACA_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { step, ...payload } = body;

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
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
