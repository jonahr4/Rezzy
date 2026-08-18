import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * GET /api/file?path=output/run_XXXX/resume.pdf
 *
 * Serves pipeline output files (PDFs, LaTeX source, etc.) from the
 * V1/output directory. Only allows access within the output/ subtree.
 */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Security: only allow paths within output/
  if (!filePath.startsWith("output/") || filePath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  // Resolve against V1/ directory (where pipeline outputs live)
  const projectRoot = path.resolve(process.cwd(), "..");
  const fullPath = path.join(projectRoot, "V1", filePath);

  // Double-check it's still inside V1/output
  const outputDir = path.join(projectRoot, "V1", "output");
  if (!fullPath.startsWith(outputDir)) {
    return NextResponse.json({ error: "Path traversal blocked" }, { status: 403 });
  }

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const data = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".tex": "text/plain; charset=utf-8",
      ".txt": "text/plain; charset=utf-8",
      ".json": "application/json",
      ".md": "text/markdown; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
    };

    return new Response(data, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Disposition": ext === ".pdf" ? "inline" : "attachment",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
