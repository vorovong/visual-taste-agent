import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/db/schema";
import { eq, desc, count, isNull } from "drizzle-orm";
import { writeFileSync, mkdirSync, existsSync } from "fs";

const sqlite = new Database("data/vta.db");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function generateProfile() {
  // Stats
  const [total] = db.select({ count: count() }).from(schema.references).all() as any;
  const [pending] = db
    .select({ count: count() })
    .from(schema.references)
    .where(isNull(schema.references.verdict))
    .all() as any;

  const refs = db.select().from(schema.references).all();
  const liked = refs.filter((r) => r.verdict === "like");
  const disliked = refs.filter((r) => r.verdict === "dislike");

  // Tags
  const tags = db
    .select()
    .from(schema.hashtags)
    .orderBy(desc(schema.hashtags.usageCount))
    .all();

  // Liked references with details
  const likedDetails = liked.map((ref) => {
    const hashtags = db
      .select({ name: schema.hashtags.name })
      .from(schema.referenceHashtags)
      .innerJoin(schema.hashtags, eq(schema.referenceHashtags.hashtagId, schema.hashtags.id))
      .where(eq(schema.referenceHashtags.referenceId, ref.id))
      .all();

    const [metadata] = db
      .select()
      .from(schema.designMetadata)
      .where(eq(schema.designMetadata.referenceId, ref.id))
      .limit(1)
      .all();

    return {
      id: ref.id,
      url: ref.url,
      title: ref.title,
      tags: hashtags.map((h) => h.name),
      colors: metadata?.colors ? JSON.parse(metadata.colors) : null,
      fonts: metadata?.fonts ? JSON.parse(metadata.fonts) : null,
    };
  });

  const dislikedDetails = disliked.map((ref) => {
    const hashtags = db
      .select({ name: schema.hashtags.name })
      .from(schema.referenceHashtags)
      .innerJoin(schema.hashtags, eq(schema.referenceHashtags.hashtagId, schema.hashtags.id))
      .where(eq(schema.referenceHashtags.referenceId, ref.id))
      .all();
    return {
      id: ref.id,
      url: ref.url,
      title: ref.title,
      tags: hashtags.map((h) => h.name),
    };
  });

  const evaluated = liked.length + disliked.length;
  let level = 0;
  if (evaluated >= 20) level = 2;
  else if (evaluated >= 5) level = 1;

  // Generate profile markdown
  const profile = `# 취향 프로필

> 자동 생성됨 (${new Date().toISOString().split("T")[0]})

## 현재 레벨: Lv.${level}

| 지표 | 값 |
|---|---|
| 총 레퍼런스 | ${total.count} |
| 평가 완료 | ${evaluated} |
| 미평가 | ${pending.count} |
| 좋아요 | ${liked.length} |
| 싫어요 | ${disliked.length} |

## 확실한 것

(에이전트 세션에서 사용자 확인 후 채워짐)

## 추정

(에이전트가 패턴 분석 후 채워짐)

## 좋아하는 레퍼런스

${likedDetails
  .map(
    (r) =>
      `### ${r.title || new URL(r.url).hostname} (ref ${r.id})
- URL: ${r.url}
- 태그: ${r.tags.length > 0 ? r.tags.map((t) => `#${t}`).join(" ") : "(없음)"}${
        r.colors?.primary ? `\n- 주 색상: ${r.colors.primary}` : ""
      }${
        r.fonts && r.fonts.length > 0
          ? `\n- 주 폰트: ${r.fonts[0].family}`
          : ""
      }`
  )
  .join("\n\n")}

${
  dislikedDetails.length > 0
    ? `## 싫어하는 레퍼런스

${dislikedDetails
  .map(
    (r) =>
      `### ${r.title || new URL(r.url).hostname} (ref ${r.id})
- URL: ${r.url}
- 태그: ${r.tags.length > 0 ? r.tags.map((t) => `#${t}`).join(" ") : "(없음)"}`
  )
  .join("\n\n")}`
    : ""
}

## 해시태그 풀

${tags.map((t) => `- #${t.name} (${t.usageCount}회)`).join("\n")}

## 거부 이력

(에이전트 세션에서 채워짐)
`;

  // Write
  mkdirSync("design-system", { recursive: true });
  mkdirSync("design-system/patterns", { recursive: true });
  mkdirSync("design-system/tokens", { recursive: true });
  mkdirSync("design-system/systems", { recursive: true });
  writeFileSync("design-system/profile.md", profile);

  console.log(`Profile generated: design-system/profile.md`);
  console.log(`Level: ${level}, Refs: ${total.count}, Evaluated: ${evaluated}`);
}

generateProfile();
