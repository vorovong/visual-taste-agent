import { Suspense } from "react";
import { db, schema } from "@/lib/db/index";
import { count, eq, isNull, desc } from "drizzle-orm";
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

  return {
    total: total.count,
    liked: liked.count,
    disliked: disliked.count,
    pending: pending.count,
    topTags,
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
