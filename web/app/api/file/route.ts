import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join, resolve, normalize } from "path";

const REPO_ROOT = join(process.cwd(), "..");
const OUTPUT_ROOT = resolve(join(REPO_ROOT, "output"));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path param" }, { status: 400 });
  }

  // Safety: ensure the resolved path stays within output/
  const fullPath = resolve(join(REPO_ROOT, filePath));
  if (!fullPath.startsWith(OUTPUT_ROOT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const content = readFileSync(fullPath, "utf-8");
    // Detect content type
    const ext = normalize(filePath).split(".").pop()?.toLowerCase();
    const contentType =
      ext === "json"
        ? "application/json"
        : ext === "pdf"
          ? "application/pdf"
          : "text/plain";

    if (ext === "pdf") {
      const binary = readFileSync(fullPath);
      return new NextResponse(binary, {
        headers: { "Content-Type": "application/pdf" },
      });
    }

    return new NextResponse(content, {
      headers: { "Content-Type": contentType + "; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
