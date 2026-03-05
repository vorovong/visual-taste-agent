import { type Bot } from "grammy";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { eq, count, isNull } from "drizzle-orm";
import { db, schema } from "../../lib/db/index";
import { captureUrl } from "../../lib/capture/index";

const URL_REGEX = /https?:\/\/[^\s]+/;

const SCREENSHOTS_BASE = join(process.cwd(), "public", "screenshots");

export function registerCollectHandlers(bot: Bot) {
  // URL 수신 -> 자동 캡쳐 -> pending 저장
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    const urlMatch = text.match(URL_REGEX);
    if (!urlMatch) {
      await ctx.reply("URL을 보내주세요.");
      return;
    }

    const url = urlMatch[0];

    // 중복 체크
    const existing = await db
      .select()
      .from(schema.references)
      .where(eq(schema.references.url, url))
      .limit(1);

    if (existing.length > 0) {
      const ref = existing[0];
      await ctx.reply(
        `이미 저장된 URL입니다 (ID: ${ref.id}, ${ref.verdict || "미평가"}).`
      );
      return;
    }

    const statusMsg = await ctx.reply("캡쳐 중...");

    const now = new Date().toISOString();
    const [inserted] = await db
      .insert(schema.references)
      .values({
        url,
        sourceType: "url",
        capturedAt: now,
      })
      .returning();

    const refId = inserted.id;
    const screenshotsDir = join(SCREENSHOTS_BASE, String(refId));

    const result = await captureUrl(url, screenshotsDir);

    if (result.title || result.iframeAllowed !== undefined) {
      await db
        .update(schema.references)
        .set({
          title: result.title || null,
          iframeAllowed: result.iframeAllowed ?? null,
        })
        .where(eq(schema.references.id, refId));
    }

    for (const file of result.files) {
      const viewport = file.replace(".png", "") as "mobile" | "tablet" | "desktop";
      await db.insert(schema.screenshots).values({
        referenceId: refId,
        viewport,
        path: `${refId}/${file}`,
      });
    }

    if (result.metadata) {
      await db.insert(schema.designMetadata).values({
        referenceId: refId,
        colors: JSON.stringify(result.metadata.colors),
        fonts: JSON.stringify(result.metadata.fonts),
        layout: JSON.stringify(result.metadata.layout),
        meta: JSON.stringify(result.metadata.meta),
      });
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.references);
    const [pendingResult] = await db
      .select({ total: count() })
      .from(schema.references)
      .where(isNull(schema.references.verdict));

    const captureNote =
      result.files.length > 0 ? `${result.files.length}종 캡쳐` : "캡쳐 실패";
    const titleNote = result.title ? `\n${result.title}` : "";

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `저장됨. (${captureNote})${titleNote}\n현재 ${totalResult.total}개, 미평가 ${pendingResult.total}개`
    );
  });

  // 이미지 수신
  bot.on("message:photo", async (ctx) => {
    const photo = ctx.message.photo;
    const largest = photo[photo.length - 1];
    const file = await ctx.api.getFile(largest.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    const now = new Date().toISOString();
    const [inserted] = await db
      .insert(schema.references)
      .values({
        url: fileUrl,
        sourceType: "image",
        iframeAllowed: false,
        capturedAt: now,
      })
      .returning();

    const refId = inserted.id;
    const screenshotsDir = join(SCREENSHOTS_BASE, String(refId));
    await mkdir(screenshotsDir, { recursive: true });

    try {
      const res = await fetch(fileUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(join(screenshotsDir, "original.png"), buffer);
      await db.insert(schema.screenshots).values({
        referenceId: refId,
        viewport: "desktop",
        path: `${refId}/original.png`,
      });
    } catch {
      // download failure is non-critical
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(schema.references);
    const [pendingResult] = await db
      .select({ total: count() })
      .from(schema.references)
      .where(isNull(schema.references.verdict));

    await ctx.reply(
      `이미지 저장됨.\n현재 ${totalResult.total}개, 미평가 ${pendingResult.total}개`
    );
  });
}
