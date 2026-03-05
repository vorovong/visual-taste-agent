import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { desc } from "drizzle-orm";

export async function GET() {
  const hashtags = await db
    .select()
    .from(schema.hashtags)
    .orderBy(desc(schema.hashtags.usageCount));

  return NextResponse.json(hashtags);
}
