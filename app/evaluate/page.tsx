export const dynamic = "force-dynamic";

import { db, schema } from "@/lib/db/index";
import { isNull, desc, eq } from "drizzle-orm";
import { EvaluateClient } from "./evaluate-client";

async function getPendingReferences() {
  const refs = await db
    .select({
      id: schema.references.id,
      url: schema.references.url,
      title: schema.references.title,
      sourceDomain: schema.references.sourceDomain,
      contentType: schema.references.contentType,
      capturedAt: schema.references.capturedAt,
    })
    .from(schema.references)
    .where(isNull(schema.references.verdict))
    .orderBy(desc(schema.references.capturedAt));

  const results = await Promise.all(
    refs.map(async (ref) => {
      const screenshots = await db
        .select({
          viewport: schema.screenshots.viewport,
          path: schema.screenshots.path,
        })
        .from(schema.screenshots)
        .where(eq(schema.screenshots.referenceId, ref.id));

      return { ...ref, screenshots };
    })
  );

  return results;
}

export default async function EvaluatePage() {
  const refs = await getPendingReferences();

  return <EvaluateClient initialRefs={refs} />;
}
