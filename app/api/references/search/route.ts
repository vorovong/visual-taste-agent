export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { eq, sql, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  const pattern = `%${q}%`;

  // Search by title, url, source_domain, or hashtag name
  const refs = await db
    .select({
      id: schema.references.id,
      title: schema.references.title,
      url: schema.references.url,
      sourceDomain: schema.references.sourceDomain,
      contentType: schema.references.contentType,
      verdict: schema.references.verdict,
    })
    .from(schema.references)
    .where(
      sql`(
        ${schema.references.title} LIKE ${pattern}
        OR ${schema.references.url} LIKE ${pattern}
        OR ${schema.references.sourceDomain} LIKE ${pattern}
        OR ${schema.references.id} IN (
          SELECT rh.reference_id FROM reference_hashtags rh
          JOIN hashtags h ON h.id = rh.hashtag_id
          WHERE h.name LIKE ${pattern}
        )
      )`
    )
    .orderBy(desc(schema.references.capturedAt))
    .limit(10);

  // Get first screenshot for each result
  const results = await Promise.all(
    refs.map(async (ref) => {
      const [shot] = await db
        .select({ path: schema.screenshots.path })
        .from(schema.screenshots)
        .where(eq(schema.screenshots.referenceId, ref.id))
        .limit(1);

      return {
        ...ref,
        screenshot: shot?.path || null,
      };
    })
  );

  return NextResponse.json(results);
}
