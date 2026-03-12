import "dotenv/config";
import { Bot } from "grammy";
import { count, isNull, eq, sql } from "drizzle-orm";
import { join } from "path";
import { registerCollectHandlers } from "./handlers/collect";
import { runMigrations } from "../lib/db/migrate";
import { db, schema } from "../lib/db/index";
import { captureUrl } from "../lib/capture/index";
import { analyzeDesign } from "../lib/ai/gemini";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN이 .env에 설정되지 않았습니다.");
  process.exit(1);
}

// DB 초기화
runMigrations();

const bot = new Bot(token);

const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID;

// chat_id 화이트리스트
if (ALLOWED_CHAT_ID) {
  bot.use(async (ctx, next) => {
    const chatId = String(ctx.chat?.id);
    if (chatId !== ALLOWED_CHAT_ID) {
      return;
    }
    await next();
  });
}

// /start 명령
bot.command("start", (ctx) =>
  ctx.reply(
    "Visual Taste Agent v2\n\n" +
      "URL을 보내주세요. 자동 캡쳐 후 저장됩니다.\n" +
      "평가는 웹앱에서 나중에 하면 됩니다."
  )
);

// /status 명령
bot.command("status", async (ctx) => {
  const [totalResult] = await db
    .select({ total: count() })
    .from(schema.references);

  const [pendingResult] = await db
    .select({ total: count() })
    .from(schema.references)
    .where(isNull(schema.references.verdict));

  const total = totalResult.total;
  const level = total >= 20 ? "Lv.2" : total >= 5 ? "Lv.1" : "Lv.0";
  await ctx.reply(
    `레퍼런스: ${total}개 (미평가: ${pendingResult.total}개)\n레벨: ${level}`
  );
});

// /recapture 명령 — 스크린샷 없는 레퍼런스 재캡쳐
bot.command("recapture", async (ctx) => {
  const SCREENSHOTS_BASE = join(process.cwd(), "public", "screenshots");

  // 스크린샷이 없는 URL 타입 레퍼런스 조회
  const refs = await db
    .select({
      id: schema.references.id,
      url: schema.references.url,
      sourceType: schema.references.sourceType,
    })
    .from(schema.references)
    .where(eq(schema.references.sourceType, "url"));

  const refsWithoutScreenshots: typeof refs = [];
  for (const ref of refs) {
    const shots = await db
      .select()
      .from(schema.screenshots)
      .where(eq(schema.screenshots.referenceId, ref.id))
      .limit(1);
    if (shots.length === 0) {
      refsWithoutScreenshots.push(ref);
    }
  }

  if (refsWithoutScreenshots.length === 0) {
    await ctx.reply("모든 레퍼런스에 스크린샷이 있습니다.");
    return;
  }

  const statusMsg = await ctx.reply(
    `${refsWithoutScreenshots.length}개 레퍼런스 재캡쳐 시작...`
  );

  let success = 0;
  let failed = 0;

  for (const ref of refsWithoutScreenshots) {
    const screenshotsDir = join(SCREENSHOTS_BASE, String(ref.id));
    try {
      const result = await captureUrl(ref.url, screenshotsDir);

      if (result.files.length > 0) {
        // 스크린샷 DB 기록
        for (const file of result.files) {
          const viewport = file.replace(".png", "") as "mobile" | "tablet" | "desktop";
          await db.insert(schema.screenshots).values({
            referenceId: ref.id,
            viewport,
            path: `${ref.id}/${file}`,
          });
        }

        // 타이틀/iframe 업데이트
        if (result.title || result.iframeAllowed !== undefined) {
          await db
            .update(schema.references)
            .set({
              title: result.title || null,
              iframeAllowed: result.iframeAllowed ?? null,
            })
            .where(eq(schema.references.id, ref.id));
        }

        // Puppeteer 메타데이터 저장 (기존 없으면)
        const existingMeta = await db
          .select()
          .from(schema.designMetadata)
          .where(eq(schema.designMetadata.referenceId, ref.id))
          .limit(1);

        const puppeteerMeta = result.metadata;
        let mergedColors = puppeteerMeta ? puppeteerMeta.colors : {};
        let mergedFonts = puppeteerMeta ? puppeteerMeta.fonts : [];
        let mergedLayout = puppeteerMeta ? puppeteerMeta.layout : {};
        let mergedMeta: Record<string, unknown> = puppeteerMeta ? { ...puppeteerMeta.meta } : {};

        // Gemini 분석
        const desktopScreenshot = join(screenshotsDir, "desktop.png");
        try {
          const geminiResult = await analyzeDesign(desktopScreenshot);
          if (geminiResult) {
            mergedMeta = {
              ...mergedMeta,
              gemini: {
                colors: geminiResult.colors,
                typography: geminiResult.typography,
                layout: geminiResult.layout,
                style: geminiResult.style,
                contentType: geminiResult.contentType,
                suggestedTags: geminiResult.suggestedTags,
              },
            };
            if (geminiResult.contentType && geminiResult.contentType !== "other") {
              await db
                .update(schema.references)
                .set({ contentType: geminiResult.contentType })
                .where(eq(schema.references.id, ref.id));
            }
          }
        } catch (e) {
          console.error(`Gemini recapture failed for ${ref.url}:`, e instanceof Error ? e.message : e);
        }

        if (existingMeta.length === 0) {
          await db.insert(schema.designMetadata).values({
            referenceId: ref.id,
            colors: JSON.stringify(mergedColors),
            fonts: JSON.stringify(mergedFonts),
            layout: JSON.stringify(mergedLayout),
            meta: JSON.stringify(mergedMeta),
          });
        } else {
          await db
            .update(schema.designMetadata)
            .set({
              colors: JSON.stringify(mergedColors),
              fonts: JSON.stringify(mergedFonts),
              layout: JSON.stringify(mergedLayout),
              meta: JSON.stringify(mergedMeta),
            })
            .where(eq(schema.designMetadata.referenceId, ref.id));
        }

        success++;
      } else {
        failed++;
        console.error(`Recapture failed for ${ref.url}: no files`);
      }
    } catch (e) {
      failed++;
      console.error(`Recapture error for ${ref.url}:`, e instanceof Error ? e.message : e);
    }
  }

  await ctx.api.editMessageText(
    ctx.chat.id,
    statusMsg.message_id,
    `재캡쳐 완료: ${success}개 성공, ${failed}개 실패`
  );
});

// 수집 핸들러 등록
registerCollectHandlers(bot);

// 에러 핸들링
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// 시작
bot.start({
  onStart: () => console.log("Visual Taste Bot v2 시작됨"),
});
