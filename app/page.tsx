export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { db, schema } from "@/lib/db/index";
import { count, eq, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { GalleryClient } from "./gallery-client";

async function getStats() {
  const [total] = await db.select({ count: count() }).from(schema.references);
  const [liked] = await db
    .select({ count: count() })
    .from(schema.references)
    .where(eq(schema.references.verdict, "like"));
  const [disliked] = await db
    .select({ count: count() })
    .from(schema.references)
    .where(eq(schema.references.verdict, "dislike"));
  const [pending] = await db
    .select({ count: count() })
    .from(schema.references)
    .where(isNull(schema.references.verdict));

  const topTags = await db
    .select()
    .from(schema.hashtags)
    .orderBy(desc(schema.hashtags.usageCount))
    .limit(10);

  // Content type counts
  const ctRows = await db
    .select({
      ct: schema.references.contentType,
      cnt: count(),
    })
    .from(schema.references)
    .where(isNotNull(schema.references.contentType))
    .groupBy(schema.references.contentType);

  const contentTypes: Record<string, number> = {};
  for (const row of ctRows) {
    if (row.ct) contentTypes[row.ct] = row.cnt;
  }

  return {
    total: total.count,
    liked: liked.count,
    disliked: disliked.count,
    pending: pending.count,
    topTags,
    contentTypes,
  };
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <Suspense>
      <GalleryClient stats={stats} />
    </Suspense>
  );
}
