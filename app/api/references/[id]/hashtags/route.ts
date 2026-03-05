import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { eq, and, sql } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const refId = parseInt(id, 10);
  const { name } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const tagName = name.trim().toLowerCase();

  // Get or create hashtag
  let [hashtag] = await db
    .select()
    .from(schema.hashtags)
    .where(eq(schema.hashtags.name, tagName))
    .limit(1);

  if (!hashtag) {
    [hashtag] = await db
      .insert(schema.hashtags)
      .values({ name: tagName, usageCount: 1 })
      .returning();
  } else {
    await db
      .update(schema.hashtags)
      .set({ usageCount: sql`${schema.hashtags.usageCount} + 1` })
      .where(eq(schema.hashtags.id, hashtag.id));
  }

  // Check if already linked
  const [existing] = await db
    .select()
    .from(schema.referenceHashtags)
    .where(
      and(
        eq(schema.referenceHashtags.referenceId, refId),
        eq(schema.referenceHashtags.hashtagId, hashtag.id)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(schema.referenceHashtags).values({
      referenceId: refId,
      hashtagId: hashtag.id,
    });

    // Log
    await db.insert(schema.tasteLog).values({
      referenceId: refId,
      field: "hashtag_add",
      oldValue: null,
      newValue: tagName,
      changedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ id: hashtag.id, name: tagName });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const refId = parseInt(id, 10);
  const { hashtagId } = await req.json();

  await db
    .delete(schema.referenceHashtags)
    .where(
      and(
        eq(schema.referenceHashtags.referenceId, refId),
        eq(schema.referenceHashtags.hashtagId, hashtagId)
      )
    );

  // Decrement usage count
  await db
    .update(schema.hashtags)
    .set({ usageCount: sql`MAX(${schema.hashtags.usageCount} - 1, 0)` })
    .where(eq(schema.hashtags.id, hashtagId));

  return NextResponse.json({ success: true });
}
