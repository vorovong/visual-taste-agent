export const dynamic = "force-dynamic";

import { db, schema, sqlite } from "@/lib/db/index";
import { eq, gt, lt, desc } from "drizzle-orm";

function safeJSON(str: string | null): unknown {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}
import { notFound } from "next/navigation";
import { DetailClient } from "./detail-client";

export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const refId = parseInt(id, 10);

  const [ref] = await db
    .select()
    .from(schema.references)
    .where(eq(schema.references.id, refId))
    .limit(1);

  if (!ref) notFound();

  const screenshots = await db
    .select()
    .from(schema.screenshots)
    .where(eq(schema.screenshots.referenceId, refId));

  const hashtags = await db
    .select({
      id: schema.hashtags.id,
      name: schema.hashtags.name,
      category: schema.hashtags.category,
    })
    .from(schema.referenceHashtags)
    .innerJoin(
      schema.hashtags,
      eq(schema.referenceHashtags.hashtagId, schema.hashtags.id)
    )
    .where(eq(schema.referenceHashtags.referenceId, refId));

  const [metadata] = await db
    .select()
    .from(schema.designMetadata)
    .where(eq(schema.designMetadata.referenceId, refId))
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsedMetadata: any = metadata
    ? {
        colors: safeJSON(metadata.colors),
        fonts: safeJSON(metadata.fonts),
        layout: safeJSON(metadata.layout),
        meta: safeJSON(metadata.meta),
      }
    : null;

  // Prev/Next navigation
  const [prevRef] = await db
    .select({ id: schema.references.id, title: schema.references.title })
    .from(schema.references)
    .where(lt(schema.references.id, refId))
    .orderBy(desc(schema.references.id))
    .limit(1);

  const [nextRef] = await db
    .select({ id: schema.references.id, title: schema.references.title })
    .from(schema.references)
    .where(gt(schema.references.id, refId))
    .orderBy(schema.references.id)
    .limit(1);

  // Related references: same tags (ranked by shared tag count) + same domain
  const relatedRefs = sqlite.prepare(`
    SELECT r.id, r.url, r.title, r.verdict, r.source_domain as sourceDomain,
           s.path as screenshotPath, COUNT(rh.hashtag_id) as sharedTags
    FROM "references" r
    LEFT JOIN screenshots s ON s.reference_id = r.id AND s.viewport = 'desktop'
    LEFT JOIN reference_hashtags rh ON rh.reference_id = r.id
      AND rh.hashtag_id IN (SELECT hashtag_id FROM reference_hashtags WHERE reference_id = ?)
    WHERE r.id != ? AND r.verdict != 'delete'
    GROUP BY r.id
    HAVING sharedTags > 0
       OR r.source_domain = ?
    ORDER BY sharedTags DESC, r.id DESC
    LIMIT 6
  `).all(refId, refId, ref.sourceDomain || '') as {
    id: number; url: string; title: string | null; verdict: string | null;
    sourceDomain: string | null; screenshotPath: string | null; sharedTags: number;
  }[];

  return (
    <DetailClient
      reference={ref}
      screenshots={screenshots}
      hashtags={hashtags}
      metadata={parsedMetadata}
      prevRef={prevRef || null}
      nextRef={nextRef || null}
      relatedRefs={relatedRefs}
    />
  );
}
