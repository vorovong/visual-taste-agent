import puppeteer from 'puppeteer';
import { join } from 'path';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

export async function captureUrl(url, outputDir) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const savedFiles = [];

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        // 렌더링 안정화 대기
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        await page.close();
        continue;
      }

      const filename = `${vp.name}.png`;
      await page.screenshot({
        path: join(outputDir, filename),
        fullPage: false,
      });
      savedFiles.push(filename);
      await page.close();
    }

    return { success: true, files: savedFiles };
  } catch (e) {
    return { success: false, error: e.message, files: [] };
  } finally {
    if (browser) await browser.close();
  }
}
