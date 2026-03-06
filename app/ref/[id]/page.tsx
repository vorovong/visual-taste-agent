export const dynamic = "force-dynamic";

import { db, schema } from "@/lib/db/index";
import { eq } from "drizzle-orm";
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

  const parsedMetadata = metadata
    ? {
        colors: metadata.colors ? JSON.parse(metadata.colors) : null,
        fonts: metadata.fonts ? JSON.parse(metadata.fonts) : null,
        layout: metadata.layout ? JSON.parse(metadata.layout) : null,
        meta: metadata.meta ? JSON.parse(metadata.meta) : null,
      }
    : null;

  return (
    <DetailClient
      reference={ref}
      screenshots={screenshots}
      hashtags={hashtags}
      metadata={parsedMetadata}
    />
  );
}
