import puppeteer, { type Page } from "puppeteer";
import { join } from "path";
import { mkdir } from "fs/promises";
import type { CaptureResult, ColorPalette, FontInfo, LayoutInfo, FrameworkMeta } from "../types";

const VIEWPORTS = [
  { name: "mobile" as const, width: 375, height: 812 },
  { name: "tablet" as const, width: 768, height: 1024 },
  { name: "desktop" as const, width: 1440, height: 900 },
];

async function extractTitle(page: Page): Promise<string | undefined> {
  try {
    return await page.title();
  } catch {
    return undefined;
  }
}

async function checkIframeAllowed(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const xfo = res.headers.get("x-frame-options");
    const csp = res.headers.get("content-security-policy");
    if (xfo) return false;
    if (csp && csp.includes("frame-ancestors")) {
      if (csp.includes("frame-ancestors 'none'") || csp.includes("frame-ancestors 'self'")) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function extractDesignMetadata(page: Page): Promise<{
  colors: ColorPalette;
  fonts: FontInfo[];
  layout: LayoutInfo;
  meta: FrameworkMeta;
}> {
  const data = await page.evaluate(() => {
    const getComputed = (el: Element, prop: string) =>
      getComputedStyle(el).getPropertyValue(prop);

    const body = document.body;
    const bgColors = new Set<string>();
    const textColors = new Set<string>();
    const accentColors = new Set<string>();
    let primaryColor: string | undefined;

    bgColors.add(getComputed(body, "background-color"));
    textColors.add(getComputed(body, "color"));

    const sections = document.querySelectorAll("section, main, header, div[class]");
    sections.forEach((el) => {
      const bg = getComputed(el, "background-color");
      if (bg && bg !== "rgba(0, 0, 0, 0)") bgColors.add(bg);
    });

    const buttons = document.querySelectorAll("button, a[class*='btn'], [role='button']");
    buttons.forEach((el) => {
      const bg = getComputed(el, "background-color");
      if (bg && bg !== "rgba(0, 0, 0, 0)") {
        accentColors.add(bg);
        if (!primaryColor) primaryColor = bg;
      }
    });

    const headings = document.querySelectorAll("h1, h2, h3");
    headings.forEach((el) => {
      textColors.add(getComputed(el, "color"));
    });

    const fontSet = new Map<string, { size: string; weight: string }>();
    const textEls = document.querySelectorAll("h1, h2, h3, p, span, a, li, button");
    textEls.forEach((el) => {
      const family = getComputed(el, "font-family").split(",")[0].trim().replace(/['"]/g, "");
      const size = getComputed(el, "font-size");
      const weight = getComputed(el, "font-weight");
      if (family && !fontSet.has(family)) {
        fontSet.set(family, { size, weight });
      }
    });

    const mainEl = document.querySelector("main") || document.querySelector("[class*='container']") || body;
    const display = getComputed(mainEl, "display");
    const gridCols = getComputed(mainEl, "grid-template-columns");
    const gap = getComputed(mainEl, "gap");
    const padding = getComputed(mainEl, "padding");

    const metaGen = document.querySelector('meta[name="generator"]')?.getAttribute("content") || "";
    const scripts = Array.from(document.querySelectorAll("script[src]"))
      .map((s) => s.getAttribute("src") || "")
      .filter(Boolean);

    let framework = "";
    const libraries: string[] = [];

    if (document.querySelector("[data-nextjs-scroll-focus-boundary]") || document.getElementById("__next")) {
      framework = "Next.js";
    } else if (document.getElementById("__nuxt")) {
      framework = "Nuxt";
    } else if (metaGen.includes("WordPress")) {
      framework = "WordPress";
    } else if (document.querySelector("[ng-version]")) {
      framework = "Angular";
    }

    scripts.forEach((src) => {
      if (src.includes("react")) libraries.push("React");
      if (src.includes("vue")) libraries.push("Vue");
      if (src.includes("jquery")) libraries.push("jQuery");
    });

    const allClasses = Array.from(document.querySelectorAll("[class]"))
      .slice(0, 30)
      .map((el) => el.className)
      .join(" ");
    if (/\b(flex|grid|bg-|text-|px-|py-|mt-|mb-)\b/.test(allClasses)) {
      libraries.push("Tailwind CSS");
    }

    return {
      colors: {
        background: [...bgColors].filter((c) => c !== "rgba(0, 0, 0, 0)"),
        text: [...textColors],
        primary: primaryColor,
        accent: [...accentColors],
      },
      fonts: [...fontSet.entries()].map(([family, info]) => ({
        family,
        size: info.size,
        weight: info.weight,
      })),
      layout: {
        type: display.includes("grid") ? "grid" : display.includes("flex") ? "flex" : "block",
        columns: gridCols && gridCols !== "none" ? gridCols.split(" ").length : undefined,
        gap: gap !== "normal" ? gap : undefined,
        padding,
      },
      meta: {
        framework: framework || undefined,
        libraries: libraries.length > 0 ? libraries : undefined,
      },
    };
  });

  return data as {
    colors: ColorPalette;
    fonts: FontInfo[];
    layout: LayoutInfo;
    meta: FrameworkMeta;
  };
}

export async function captureUrl(url: string, outputDir: string): Promise<CaptureResult> {
  let browser;
  try {
    await mkdir(outputDir, { recursive: true });
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const savedFiles: string[] = [];
    let title: string | undefined;
    let metadata: CaptureResult["metadata"];

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 1500));
      } catch {
        await page.close();
        continue;
      }

      if (vp.name === "desktop") {
        title = await extractTitle(page);
        try {
          metadata = await extractDesignMetadata(page);
        } catch {
          // metadata extraction failure is non-critical
        }
      }

      const filename = `${vp.name}.png`;
      await page.screenshot({
        path: join(outputDir, filename),
        fullPage: false,
      });
      savedFiles.push(filename);
      await page.close();
    }

    const iframeAllowed = await checkIframeAllowed(url);

    return { success: true, files: savedFiles, title, iframeAllowed, metadata };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      files: [],
    };
  } finally {
    if (browser) await browser.close();
  }
}
