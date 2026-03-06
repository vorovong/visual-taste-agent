import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { count, eq, isNull, isNotNull, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

  // content_type별 카운트
  const contentTypeRows = await db
    .select({
      contentType: schema.references.contentType,
      count: count(),
    })
    .from(schema.references)
    .groupBy(schema.references.contentType);

  const contentTypes: Record<string, number> = {};
  for (const row of contentTypeRows) {
    contentTypes[row.contentType || "website"] = row.count;
  }

  // 상위 10개 도메인 + 카운트
  const topDomains = await db
    .select({
      domain: schema.references.sourceDomain,
      count: count(),
    })
    .from(schema.references)
    .where(isNotNull(schema.references.sourceDomain))
    .groupBy(schema.references.sourceDomain)
    .orderBy(desc(count()))
    .limit(10);

  return NextResponse.json({
    total: total.count,
    liked: liked.count,
    disliked: disliked.count,
    pending: pending.count,
    topTags,
    recent,
    contentTypes,
    topDomains,
  });
}
