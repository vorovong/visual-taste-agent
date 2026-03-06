import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { eq, isNull, isNotNull, count, desc, like, inArray, sql, and, gt, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const verdict = searchParams.get("verdict");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "newest";
  const contentType = searchParams.get("content_type");
  const domain = searchParams.get("domain");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100);

  // Build where conditions
  const conditions = [];

  // Filter by verdict
  if (verdict === "pending") {
    conditions.push(isNull(schema.references.verdict));
  } else if (verdict === "like" || verdict === "dislike") {
    conditions.push(eq(schema.references.verdict, verdict));
  } else if (verdict === "evaluated") {
    conditions.push(isNotNull(schema.references.verdict));
  }

  // Search by title or url
  if (search) {
    conditions.push(
      sql`(${schema.references.title} LIKE ${'%' + search + '%'} OR ${schema.references.url} LIKE ${'%' + search + '%'})`
    );
  }

  // Filter by content_type
  if (contentType) {
    conditions.push(eq(schema.references.contentType, contentType));
  }

  // Filter by domain (source_domain)
  if (domain) {
    conditions.push(eq(schema.references.sourceDomain, domain));
  }

  // Cursor-based pagination: fetch one extra to determine nextCursor
  if (cursor) {
    const cursorId = parseInt(cursor, 10);
    if (!isNaN(cursorId)) {
      if (sort === "oldest") {
        conditions.push(gt(schema.references.id, cursorId));
      } else {
        conditions.push(lt(schema.references.id, cursorId));
      }
    }
  }

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
      sourceDomain: schema.references.sourceDomain,
      contentType: schema.references.contentType,
    })
    .from(schema.references)
    .$dynamic();

  // Apply combined where conditions
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Sort
  if (sort === "oldest") {
    query = query.orderBy(schema.references.capturedAt, schema.references.id);
  } else {
    query = query.orderBy(desc(schema.references.capturedAt), desc(schema.references.id));
  }

  // Fetch limit + 1 to check if there's a next page
  query = query.limit(limit + 1);

  const refs = await query;

  // Determine if there's a next page
  const hasMore = refs.length > limit;
  const pageRefs = hasMore ? refs.slice(0, limit) : refs;
  const nextCursor = hasMore ? pageRefs[pageRefs.length - 1].id : null;

  // Get screenshots and hashtags for each ref
  const results = await Promise.all(
    pageRefs.map(async (ref) => {
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

  // If tag filter, filter after join (may reduce page size)
  if (tag) {
    const filtered = results.filter((r) =>
      r.hashtags.some((h) => h.name === tag)
    );
    return NextResponse.json({ data: filtered, nextCursor });
  }

  return NextResponse.json({ data: results, nextCursor });
}
