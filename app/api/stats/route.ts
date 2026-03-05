import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { count, eq, isNull, desc } from "drizzle-orm";

export async function GET() {
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

  const recent = await db
    .select()
    .from(schema.references)
    .orderBy(desc(schema.references.capturedAt))
    .limit(5);

  return NextResponse.json({
    total: total.count,
    liked: liked.count,
    disliked: disliked.count,
    pending: pending.count,
    topTags,
    recent,
  });
}
