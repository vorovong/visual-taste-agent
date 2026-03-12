import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const SCREENSHOTS_DIR = join(process.cwd(), "public", "screenshots");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Prevent directory traversal
  const safePath = path.join("/").replace(/\.\./g, "");
  const filePath = join(SCREENSHOTS_DIR, safePath);

  if (!filePath.startsWith(SCREENSHOTS_DIR) || !existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = safePath.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
    "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
