import { NextResponse } from "next/server";

const API_BASE =
  process.env.PIPELINE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_ACA_URL ||
  "http://127.0.0.1:5001";

/**
 * Server-side health check proxy — avoids CORS by routing
 * the browser's health ping through the Next.js API layer.
 */
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({ status: "ok" }));
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { status: "unhealthy", code: res.status },
      { status: 502 }
    );
  } catch {
    return NextResponse.json({ status: "unreachable" }, { status: 503 });
  }
}
