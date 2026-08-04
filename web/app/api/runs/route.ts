import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const REPO_ROOT = join(process.cwd(), "..");

export async function GET() {
  try {
    const indexPath = join(REPO_ROOT, "output", "runs_index.json");
    const raw = readFileSync(indexPath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    // No runs yet
    return NextResponse.json({ runs: [] });
  }
}
