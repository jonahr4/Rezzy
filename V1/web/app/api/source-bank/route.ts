import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

const REPO_ROOT = join(process.cwd(), "..");

export async function GET() {
  try {
    const bankPath = join(REPO_ROOT, "data", "source_bank.json");
    const raw = readFileSync(bankPath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "source_bank.json not found" }, { status: 404 });
  }
}
