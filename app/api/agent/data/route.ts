export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { eq, desc, count, isNull } from "drizzle-orm";

export async function GET() {
  // All references with screenshots, hashtags, metadata
  const refs = await db
    .select()
    .from(schema.references)
    .orderBy(desc(schema.references.capturedAt));

  const enriched = await Promise.all(
    refs.map(async (ref) => {
      const screenshots = await db
        .select({ viewport: schema.screenshots.viewport, path: schema.screenshots.path })
        .from(schema.screenshots)
        .where(eq(schema.screenshots.referenceId, ref.id));

      const hashtags = await db
        .select({ name: schema.hashtags.name, category: schema.hashtags.category })
        .from(schema.referenceHashtags)
        .innerJoin(schema.hashtags, eq(schema.referenceHashtags.hashtagId, schema.hashtags.id))
        .where(eq(schema.referenceHashtags.referenceId, ref.id));

      const [metadata] = await db
        .select()
        .from(schema.designMetadata)
        .where(eq(schema.designMetadata.referenceId, ref.id))
        .limit(1);

      return {
        id: ref.id,
        url: ref.url,
        title: ref.title,
        verdict: ref.verdict,
        sourceType: ref.sourceType,
        capturedAt: ref.capturedAt,
        evaluatedAt: ref.evaluatedAt,
        screenshots,
        hashtags: hashtags.map((h) => h.name),
        metadata: metadata
          ? {
              colors: metadata.colors ? JSON.parse(metadata.colors) : null,
              fonts: metadata.fonts ? JSON.parse(metadata.fonts) : null,
              layout: metadata.layout ? JSON.parse(metadata.layout) : null,
              meta: metadata.meta ? JSON.parse(metadata.meta) : null,
            }
          : null,
      };
    })
  );

  // Stats
  const [total] = await db.select({ count: count() }).from(schema.references);
  const [pending] = await db
    .select({ count: count() })
    .from(schema.references)
    .where(isNull(schema.references.verdict));

  const allTags = await db
    .select()
    .from(schema.hashtags)
    .orderBy(desc(schema.hashtags.usageCount));

  // Taste log (recent changes)
  const tasteHistory = await db
    .select()
    .from(schema.tasteLog)
    .orderBy(desc(schema.tasteLog.changedAt))
    .limit(50);

  return NextResponse.json({
    summary: {
      total: total.count,
      pending: pending.count,
      evaluated: total.count - pending.count,
      liked: enriched.filter((r) => r.verdict === "like").length,
      disliked: enriched.filter((r) => r.verdict === "dislike").length,
    },
    references: enriched,
    hashtags: allTags,
    tasteHistory,
  });
}
