import sharp from "sharp";
import { join } from "path";
import { mkdir } from "fs/promises";

interface DominantColor {
  hex: string;
  percentage: number;
}

interface ImageAnalysisResult {
  dominantColors: DominantColor[];
  width: number;
  height: number;
  format: string;
}

/**
 * Extract dominant colors and basic info from an image file.
 */
export async function analyzeImage(imagePath: string): Promise<ImageAnalysisResult> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  // Resize to small for color sampling (faster)
  const { data, info } = await image
    .resize(64, 64, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Count pixel colors, quantize to reduce palette
  const colorMap = new Map<string, number>();
  const totalPixels = info.width * info.height;

  for (let i = 0; i < data.length; i += 3) {
    // Quantize to 32-step (reduce from 16M to ~32K colors), clamp to 255
    const r = Math.min(Math.round(data[i] / 32) * 32, 255);
    const g = Math.min(Math.round(data[i + 1] / 32) * 32, 255);
    const b = Math.min(Math.round(data[i + 2] / 32) * 32, 255);
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }

  // Sort by frequency, take top 8
  const sorted = [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const dominantColors = sorted.map(([hex, count]) => ({
    hex,
    percentage: Math.round((count / totalPixels) * 100),
  }));

  return {
    dominantColors,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
  };
}

/**
 * Generate a thumbnail from an image file.
 */
export async function generateThumbnail(
  inputPath: string,
  outputDir: string,
  filename: string = "thumbnail.webp",
  width: number = 800
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, filename);
  await sharp(inputPath)
    .resize(width, undefined, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath);
  return filename;
}

/**
 * Render first page of a PDF to PNG using Puppeteer.
 * Returns the output filename.
 */
export async function renderPdfFirstPage(
  pdfPath: string,
  outputDir: string
): Promise<string> {
  const puppeteer = await import("puppeteer");
  await mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Puppeteer can open local PDF files via file:// protocol
    const fileUrl = pdfPath.startsWith("/") ? `file://${pdfPath}` : pdfPath;
    await page.goto(fileUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const outputPath = join(outputDir, "desktop.png");
    await page.screenshot({ path: outputPath, fullPage: false });
    await page.close();

    return "desktop.png";
  } finally {
    await browser.close();
  }
}
