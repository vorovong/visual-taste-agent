import "dotenv/config";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { db, schema } from "../lib/db/index";
import { runMigrations } from "../lib/db/migrate";

const DESIGN_DIR = join(process.cwd(), "design-system", "references");

interface RefData {
  id: string;
  url: string;
  captured: string;
  verdict: string;
  context: { medium: string; purpose: string };
  screenshots: string[];
}

function parseFrontmatter(content: string): RefData {
  const lines = content.split("\n");
  const data: Record<string, string> = {};
  const context: Record<string, string> = {};
  let screenshots: string[] = [];
  let inContext = false;
  let inScreenshots = false;

  for (const line of lines) {
    if (line === "---") continue;
    if (line.startsWith("## ")) break;

    if (line.startsWith("context:")) { inContext = true; inScreenshots = false; continue; }
    if (line.startsWith("screenshots:")) { inScreenshots = true; inContext = false; continue; }

    if (inContext && line.startsWith("  ")) {
      const [k, v] = line.trim().split(": ");
      context[k] = v;
    } else if (inScreenshots && line.startsWith("  - ")) {
      screenshots.push(line.trim().replace("- ", ""));
    } else if (line.includes(": ")) {
      const idx = line.indexOf(": ");
      data[line.slice(0, idx)] = line.slice(idx + 2);
    }
  }

  return {
    id: data.id,
    url: data.url,
    captured: data.captured,
    verdict: data.verdict,
    context: { medium: context.medium || "", purpose: context.purpose || "" },
    screenshots,
  };
}

async function migrate() {
  runMigrations();

  for (const refDir of ["ref-001", "ref-002"]) {
    const mdPath = join(DESIGN_DIR, refDir, `${refDir}.md`);
    try {
      await access(mdPath);
    } catch {
      console.log(`${refDir} not found, skipping`);
      continue;
    }

    const content = await readFile(mdPath, "utf-8");
    const data = parseFrontmatter(content);

    const [inserted] = await db
      .insert(schema.references)
      .values({
        url: data.url,
        title: null,
        verdict: data.verdict as "like" | "dislike" | "delete",
        sourceType: "url",
        capturedAt: new Date(data.captured).toISOString(),
        evaluatedAt: new Date(data.captured).toISOString(),
      })
      .returning();

    for (const file of data.screenshots) {
      const viewport = file.replace(".png", "") as "mobile" | "tablet" | "desktop";
      await db.insert(schema.screenshots).values({
        referenceId: inserted.id,
        viewport,
        path: `${inserted.id}/${file}`,
      });
    }

    console.log(`Migrated ${refDir} -> ID ${inserted.id} (${data.url})`);
  }
}

migrate().catch(console.error);
