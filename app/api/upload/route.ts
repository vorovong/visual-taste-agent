import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/index";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { analyzeImage, generateThumbnail, renderPdfFirstPage } from "@/lib/capture/image";
import { analyzeDesign } from "@/lib/ai/gemini";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "avif"]);
const PDF_EXTENSIONS = new Set(["pdf"]);

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contentType = (formData.get("content_type") as string) || "other";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const ext = getExtension(file.name);
    const isImage = IMAGE_EXTENSIONS.has(ext);
    const isPdf = PDF_EXTENSIONS.has(ext);

    // Create reference record in DB
    const now = new Date().toISOString();
    const [ref] = await db
      .insert(schema.references)
      .values({
        url: `file://${file.name}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        sourceType: "file",
        contentType,
        originalFilename: file.name,
        capturedAt: now,
        iframeAllowed: false,
      })
      .returning({ id: schema.references.id });

    const refId = ref.id;
    const screenshotDir = join(process.cwd(), "public", "screenshots", String(refId));
    await mkdir(screenshotDir, { recursive: true });

    // Save original file
    const originalFilename = `original.${ext || "bin"}`;
    const originalPath = join(screenshotDir, originalFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(originalPath, buffer);

    let designAnalysis = null;

    if (isImage) {
      // Process image: color extraction, thumbnail, Gemini analysis
      try {
        // Generate thumbnail as desktop.webp (used as main preview)
        const thumbnailFilename = await generateThumbnail(originalPath, screenshotDir, "desktop.webp", 1440);

        // Save screenshot record
        await db.insert(schema.screenshots).values({
          referenceId: refId,
          viewport: "desktop",
          path: `${refId}/${thumbnailFilename}`,
        });

        // Also generate mobile-sized thumbnail
        const mobileThumbnail = await generateThumbnail(originalPath, screenshotDir, "mobile.webp", 375);
        await db.insert(schema.screenshots).values({
          referenceId: refId,
          viewport: "mobile",
          path: `${refId}/${mobileThumbnail}`,
        });
      } catch (e) {
        console.error("Thumbnail generation failed:", e instanceof Error ? e.message : e);
        // Fallback: use original as screenshot
        await db.insert(schema.screenshots).values({
          referenceId: refId,
          viewport: "desktop",
          path: `${refId}/${originalFilename}`,
        });
      }

      // Dominant color extraction
      try {
        const imageAnalysis = await analyzeImage(originalPath);
        designAnalysis = {
          colors: JSON.stringify({
            palette: imageAnalysis.dominantColors.map((c) => c.hex),
            dominantColors: imageAnalysis.dominantColors,
          }),
          meta: JSON.stringify({
            width: imageAnalysis.width,
            height: imageAnalysis.height,
            format: imageAnalysis.format,
            sourceType: "file-upload",
          }),
        };
      } catch (e) {
        console.error("Image analysis failed:", e instanceof Error ? e.message : e);
      }

      // Gemini vision analysis
      try {
        const geminiResult = await analyzeDesign(originalPath);
        if (geminiResult) {
          designAnalysis = {
            colors: JSON.stringify(geminiResult.colors),
            fonts: JSON.stringify(geminiResult.typography),
            layout: JSON.stringify(geminiResult.layout),
            meta: JSON.stringify({
              ...(designAnalysis?.meta ? JSON.parse(designAnalysis.meta) : {}),
              style: geminiResult.style,
              contentType: geminiResult.contentType,
              suggestedTags: geminiResult.suggestedTags,
              sourceType: "file-upload",
            }),
          };
        }
      } catch (e) {
        console.error("Gemini analysis failed:", e instanceof Error ? e.message : e);
      }
    } else if (isPdf) {
      // Process PDF: render first page, then analyze
      try {
        const pdfScreenshot = await renderPdfFirstPage(originalPath, screenshotDir);
        await db.insert(schema.screenshots).values({
          referenceId: refId,
          viewport: "desktop",
          path: `${refId}/${pdfScreenshot}`,
        });

        // Analyze the rendered screenshot
        const renderedPath = join(screenshotDir, pdfScreenshot);

        try {
          const imageAnalysis = await analyzeImage(renderedPath);
          designAnalysis = {
            colors: JSON.stringify({
              palette: imageAnalysis.dominantColors.map((c) => c.hex),
              dominantColors: imageAnalysis.dominantColors,
            }),
            meta: JSON.stringify({
              width: imageAnalysis.width,
              height: imageAnalysis.height,
              format: "pdf",
              sourceType: "file-upload",
            }),
          };
        } catch (e) {
          console.error("PDF image analysis failed:", e instanceof Error ? e.message : e);
        }

        try {
          const geminiResult = await analyzeDesign(renderedPath);
          if (geminiResult) {
            designAnalysis = {
              colors: JSON.stringify(geminiResult.colors),
              fonts: JSON.stringify(geminiResult.typography),
              layout: JSON.stringify(geminiResult.layout),
              meta: JSON.stringify({
                ...(designAnalysis?.meta ? JSON.parse(designAnalysis.meta) : {}),
                style: geminiResult.style,
                contentType: geminiResult.contentType,
                suggestedTags: geminiResult.suggestedTags,
                sourceType: "file-upload",
              }),
            };
          }
        } catch (e) {
          console.error("PDF Gemini analysis failed:", e instanceof Error ? e.message : e);
        }
      } catch (e) {
        console.error("PDF rendering failed:", e instanceof Error ? e.message : e);
      }
    }
    // For other file types: just saved, no analysis

    // Save design metadata if we have any
    if (designAnalysis) {
      await db.insert(schema.designMetadata).values({
        referenceId: refId,
        colors: designAnalysis.colors || null,
        fonts: designAnalysis.fonts || null,
        layout: designAnalysis.layout || null,
        meta: designAnalysis.meta || null,
      });
    }

    return NextResponse.json({ id: refId, success: true });
  } catch (e) {
    console.error("Upload failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
