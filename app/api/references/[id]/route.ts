import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const refId = parseInt(id, 10);

  const [ref] = await db
    .select()
    .from(schema.references)
    .where(eq(schema.references.id, refId))
    .limit(1);

  if (!ref) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  return NextResponse.json({
    ...ref,
    screenshots,
    hashtags,
    metadata: metadata
      ? {
          colors: metadata.colors ? JSON.parse(metadata.colors) : null,
          fonts: metadata.fonts ? JSON.parse(metadata.fonts) : null,
          layout: metadata.layout ? JSON.parse(metadata.layout) : null,
          meta: metadata.meta ? JSON.parse(metadata.meta) : null,
        }
      : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const refId = parseInt(id, 10);
  const body = await req.json();

  const [existing] = await db
    .select()
    .from(schema.references)
    .where(eq(schema.references.id, refId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Log taste changes
  if (body.verdict !== undefined && body.verdict !== existing.verdict) {
    await db.insert(schema.tasteLog).values({
      referenceId: refId,
      field: "verdict",
      oldValue: existing.verdict,
      newValue: body.verdict,
      changedAt: new Date().toISOString(),
    });
  }

  const updateData: Record<string, unknown> = {};
  if (body.verdict !== undefined) {
    updateData.verdict = body.verdict;
    updateData.evaluatedAt = new Date().toISOString();
  }
  if (body.title !== undefined) updateData.title = body.title;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(schema.references)
      .set(updateData)
      .where(eq(schema.references.id, refId));
  }

  const [updated] = await db
    .select()
    .from(schema.references)
    .where(eq(schema.references.id, refId));

  return NextResponse.json(updated);
}
