import { type Bot } from "grammy";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { eq, count, isNull } from "drizzle-orm";
import { db, schema } from "../../lib/db/index";
import { captureUrl } from "../../lib/capture/index";
import { analyzeImage, generateThumbnail, renderPdfFirstPage } from "../../lib/capture/image";
import { analyzeDesign } from "../../lib/ai/gemini";

const URL_REGEX = /https?:\/\/[^\s]+/;

const SCREENSHOTS_BASE = join(process.cwd(), "public", "screenshots");

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"];

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(filename));
}

function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === ".pdf";
}

async function getStats(): Promise<{ total: number; pending: number }> {
  const [totalResult] = await db
    .select({ total: count() })
    .from(schema.references);
  const [pendingResult] = await db
    .select({ total: count() })
    .from(schema.references)
    .where(isNull(schema.references.verdict));
  return { total: totalResult.total, pending: pendingResult.total };
}

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
    const sourceDomain = extractHostname(url);
    const [inserted] = await db
      .insert(schema.references)
      .values({
        url,
        sourceType: "url",
        contentType: "website",
        sourceDomain: sourceDomain,
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

    // Puppeteer 메타데이터 저장
    const puppeteerMeta = result.metadata;
    let mergedColors = puppeteerMeta ? puppeteerMeta.colors : {};
    let mergedFonts = puppeteerMeta ? puppeteerMeta.fonts : [];
    let mergedLayout = puppeteerMeta ? puppeteerMeta.layout : {};
    let mergedMeta: Record<string, unknown> = puppeteerMeta ? { ...puppeteerMeta.meta } : {};

    // Gemini 비전 분석 (desktop 스크린샷 기준)
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
        // Gemini가 contentType을 반환하면 업데이트
        if (geminiResult.contentType && geminiResult.contentType !== "other") {
          await db
            .update(schema.references)
            .set({ contentType: geminiResult.contentType })
            .where(eq(schema.references.id, refId));
        }
      }
    } catch (e) {
      console.error("Gemini analysis failed for URL handler:", e instanceof Error ? e.message : e);
    }

    await db.insert(schema.designMetadata).values({
      referenceId: refId,
      colors: JSON.stringify(mergedColors),
      fonts: JSON.stringify(mergedFonts),
      layout: JSON.stringify(mergedLayout),
      meta: JSON.stringify(mergedMeta),
    });

    const stats = await getStats();

    const captureNote =
      result.files.length > 0 ? `${result.files.length}종 캡쳐` : "캡쳐 실패";
    const titleNote = result.title ? `\n${result.title}` : "";

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `저장됨. (${captureNote})${titleNote}\n현재 ${stats.total}개, 미평가 ${stats.pending}개`
    );
  });

  // 이미지 수신
  bot.on("message:photo", async (ctx) => {
    const photo = ctx.message.photo;
    const largest = photo[photo.length - 1];
    const file = await ctx.api.getFile(largest.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    const statusMsg = await ctx.reply("이미지 처리 중...");

    const now = new Date().toISOString();
    const [inserted] = await db
      .insert(schema.references)
      .values({
        url: fileUrl,
        sourceType: "image",
        contentType: "other",
        iframeAllowed: false,
        capturedAt: now,
      })
      .returning();

    const refId = inserted.id;
    const screenshotsDir = join(SCREENSHOTS_BASE, String(refId));
    await mkdir(screenshotsDir, { recursive: true });

    const originalPath = join(screenshotsDir, "original.png");
    let imageDownloaded = false;

    try {
      const res = await fetch(fileUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(originalPath, buffer);
      await db.insert(schema.screenshots).values({
        referenceId: refId,
        viewport: "desktop",
        path: `${refId}/original.png`,
      });
      imageDownloaded = true;
    } catch (e) {
      console.error("Photo download failed:", e instanceof Error ? e.message : e);
    }

    // sharp 분석 + Gemini 비전 분석
    let analysisNotes: string[] = [];
    if (imageDownloaded) {
      let colorData: Record<string, unknown> = {};
      let metaData: Record<string, unknown> = {};

      // sharp dominant color 추출
      try {
        const imageAnalysis = await analyzeImage(originalPath);
        colorData = {
          dominantColors: imageAnalysis.dominantColors,
          width: imageAnalysis.width,
          height: imageAnalysis.height,
          format: imageAnalysis.format,
        };
        analysisNotes.push("색상분석");
      } catch (e) {
        console.error("Sharp analysis failed:", e instanceof Error ? e.message : e);
      }

      // 썸네일 생성
      try {
        await generateThumbnail(originalPath, screenshotsDir, "thumbnail.webp");
      } catch (e) {
        console.error("Thumbnail generation failed:", e instanceof Error ? e.message : e);
      }

      // Gemini 비전 분석
      try {
        const geminiResult = await analyzeDesign(originalPath);
        if (geminiResult) {
          metaData = {
            gemini: {
              colors: geminiResult.colors,
              typography: geminiResult.typography,
              layout: geminiResult.layout,
              style: geminiResult.style,
              contentType: geminiResult.contentType,
              suggestedTags: geminiResult.suggestedTags,
            },
          };
          analysisNotes.push("AI분석");
          // Gemini contentType 반영
          if (geminiResult.contentType && geminiResult.contentType !== "other") {
            await db
              .update(schema.references)
              .set({ contentType: geminiResult.contentType })
              .where(eq(schema.references.id, refId));
          }
        }
      } catch (e) {
        console.error("Gemini analysis failed for photo:", e instanceof Error ? e.message : e);
      }

      // design_metadata 저장
      await db.insert(schema.designMetadata).values({
        referenceId: refId,
        colors: JSON.stringify(colorData),
        fonts: JSON.stringify([]),
        layout: JSON.stringify({}),
        meta: JSON.stringify(metaData),
      });
    }

    const stats = await getStats();
    const analysisNote = analysisNotes.length > 0 ? ` (${analysisNotes.join("+")})` : "";

    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `이미지 저장됨.${analysisNote}\n현재 ${stats.total}개, 미평가 ${stats.pending}개`
    );
  });

  // 파일(문서) 수신
  bot.on("message:document", async (ctx) => {
    const doc = ctx.message.document;
    if (!doc) return;

    const fileName = doc.file_name || "unknown";
    const statusMsg = await ctx.reply(`파일 처리 중... (${fileName})`);

    try {
      const file = await ctx.api.getFile(doc.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

      const now = new Date().toISOString();
      const ext = getFileExtension(fileName);

      // sourceType 결정
      const sourceType = isImageFile(fileName) ? "image" as const : "file" as const;

      const [inserted] = await db
        .insert(schema.references)
        .values({
          url: fileUrl,
          sourceType,
          contentType: "other",
          originalFilename: fileName,
          iframeAllowed: false,
          capturedAt: now,
        })
        .returning();

      const refId = inserted.id;
      const screenshotsDir = join(SCREENSHOTS_BASE, String(refId));
      await mkdir(screenshotsDir, { recursive: true });

      // 파일 다운로드
      const res = await fetch(fileUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      const savedFilename = `original${ext || ""}`;
      const savedPath = join(screenshotsDir, savedFilename);
      await writeFile(savedPath, buffer);

      let analysisNotes: string[] = [];

      if (isImageFile(fileName)) {
        // === 이미지 파일 처리 (photo와 동일) ===
        await db.insert(schema.screenshots).values({
          referenceId: refId,
          viewport: "desktop",
          path: `${refId}/${savedFilename}`,
        });

        let colorData: Record<string, unknown> = {};
        let metaData: Record<string, unknown> = {};

        // sharp 분석
        try {
          const imageAnalysis = await analyzeImage(savedPath);
          colorData = {
            dominantColors: imageAnalysis.dominantColors,
            width: imageAnalysis.width,
            height: imageAnalysis.height,
            format: imageAnalysis.format,
          };
          analysisNotes.push("색상분석");
        } catch (e) {
          console.error("Sharp analysis failed for document image:", e instanceof Error ? e.message : e);
        }

        // 썸네일 생성
        try {
          await generateThumbnail(savedPath, screenshotsDir, "thumbnail.webp");
        } catch (e) {
          console.error("Thumbnail generation failed:", e instanceof Error ? e.message : e);
        }

        // Gemini 비전 분석
        try {
          const geminiResult = await analyzeDesign(savedPath);
          if (geminiResult) {
            metaData = {
              gemini: {
                colors: geminiResult.colors,
                typography: geminiResult.typography,
                layout: geminiResult.layout,
                style: geminiResult.style,
                contentType: geminiResult.contentType,
                suggestedTags: geminiResult.suggestedTags,
              },
            };
            analysisNotes.push("AI분석");
            if (geminiResult.contentType && geminiResult.contentType !== "other") {
              await db
                .update(schema.references)
                .set({ contentType: geminiResult.contentType })
                .where(eq(schema.references.id, refId));
            }
          }
        } catch (e) {
          console.error("Gemini analysis failed for document image:", e instanceof Error ? e.message : e);
        }

        await db.insert(schema.designMetadata).values({
          referenceId: refId,
          colors: JSON.stringify(colorData),
          fonts: JSON.stringify([]),
          layout: JSON.stringify({}),
          meta: JSON.stringify(metaData),
        });

      } else if (isPdfFile(fileName)) {
        // === PDF 파일 처리 ===
        let screenshotPath: string | null = null;

        // PDF 첫 페이지 렌더링
        try {
          const renderedFilename = await renderPdfFirstPage(savedPath, screenshotsDir);
          screenshotPath = join(screenshotsDir, renderedFilename);
          await db.insert(schema.screenshots).values({
            referenceId: refId,
            viewport: "desktop",
            path: `${refId}/${renderedFilename}`,
          });
          analysisNotes.push("PDF렌더링");
        } catch (e) {
          console.error("PDF rendering failed:", e instanceof Error ? e.message : e);
        }

        if (screenshotPath) {
          let colorData: Record<string, unknown> = {};
          let metaData: Record<string, unknown> = {};

          // sharp 분석
          try {
            const imageAnalysis = await analyzeImage(screenshotPath);
            colorData = {
              dominantColors: imageAnalysis.dominantColors,
              width: imageAnalysis.width,
              height: imageAnalysis.height,
              format: imageAnalysis.format,
            };
            analysisNotes.push("색상분석");
          } catch (e) {
            console.error("Sharp analysis failed for PDF:", e instanceof Error ? e.message : e);
          }

          // 썸네일 생성
          try {
            await generateThumbnail(screenshotPath, screenshotsDir, "thumbnail.webp");
          } catch (e) {
            console.error("Thumbnail generation failed for PDF:", e instanceof Error ? e.message : e);
          }

          // Gemini 비전 분석
          try {
            const geminiResult = await analyzeDesign(screenshotPath);
            if (geminiResult) {
              metaData = {
                gemini: {
                  colors: geminiResult.colors,
                  typography: geminiResult.typography,
                  layout: geminiResult.layout,
                  style: geminiResult.style,
                  contentType: geminiResult.contentType,
                  suggestedTags: geminiResult.suggestedTags,
                },
              };
              analysisNotes.push("AI분석");
              // PDF의 경우 Gemini가 presentation/report 등으로 판단
              const ct = geminiResult.contentType;
              if (ct && ct !== "other") {
                await db
                  .update(schema.references)
                  .set({ contentType: ct })
                  .where(eq(schema.references.id, refId));
              }
            }
          } catch (e) {
            console.error("Gemini analysis failed for PDF:", e instanceof Error ? e.message : e);
          }

          await db.insert(schema.designMetadata).values({
            referenceId: refId,
            colors: JSON.stringify(colorData),
            fonts: JSON.stringify([]),
            layout: JSON.stringify({}),
            meta: JSON.stringify(metaData),
          });
        }

      } else {
        // === 기타 파일: 저장만, 스크린샷 없이 pending ===
        analysisNotes.push("파일저장만");
      }

      const stats = await getStats();
      const analysisNote = analysisNotes.length > 0 ? ` (${analysisNotes.join("+")})` : "";

      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `파일 저장됨: ${fileName}${analysisNote}\n현재 ${stats.total}개, 미평가 ${stats.pending}개`
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("Document handler error:", errMsg);
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `파일 처리 실패: ${errMsg}`
      );
    }
  });
}
