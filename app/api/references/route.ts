import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { eq, isNull, isNotNull, count, desc, like, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const verdict = searchParams.get("verdict");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "newest";

  let query = db
    .select({
      id: schema.references.id,
      url: schema.references.url,
      title: schema.references.title,
      verdict: schema.references.verdict,
      sourceType: schema.references.sourceType,
      iframeAllowed: schema.references.iframeAllowed,
      capturedAt: schema.references.capturedAt,
      evaluatedAt: schema.references.evaluatedAt,
    })
    .from(schema.references)
    .$dynamic();

  // Filter by verdict
  if (verdict === "pending") {
    query = query.where(isNull(schema.references.verdict));
  } else if (verdict === "like" || verdict === "dislike") {
    query = query.where(eq(schema.references.verdict, verdict));
  } else if (verdict === "evaluated") {
    query = query.where(isNotNull(schema.references.verdict));
  }
  // "all" or no filter: no where clause

  // Search by title or url
  if (search) {
    query = query.where(
      sql`(${schema.references.title} LIKE ${'%' + search + '%'} OR ${schema.references.url} LIKE ${'%' + search + '%'})`
    );
  }

  // Sort
  if (sort === "oldest") {
    query = query.orderBy(schema.references.capturedAt);
  } else {
    query = query.orderBy(desc(schema.references.capturedAt));
  }

  const refs = await query;

  // Get screenshots and hashtags for each ref
  const results = await Promise.all(
    refs.map(async (ref) => {
      const screenshots = await db
        .select()
        .from(schema.screenshots)
        .where(eq(schema.screenshots.referenceId, ref.id));

      const refHashtags = await db
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
        .where(eq(schema.referenceHashtags.referenceId, ref.id));

      return {
        ...ref,
        screenshots,
        hashtags: refHashtags,
      };
    })
  );

  // If tag filter, filter after join
  if (tag) {
    const filtered = results.filter((r) =>
      r.hashtags.some((h) => h.name === tag)
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(results);
}
