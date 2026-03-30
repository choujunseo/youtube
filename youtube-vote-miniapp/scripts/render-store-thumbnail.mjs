import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDir, '..');
const htmlPath = path.join(projectRoot, 'public', 'store-thumbnail-1932x828.html');
const outPath = path.join(projectRoot, 'public', 'toss-store-thumbnail-1932x828.png');

if (!fs.existsSync(htmlPath)) {
  console.error('Missing HTML:', htmlPath);
  process.exit(1);
}

const fileUrl = pathToFileURL(htmlPath).href;

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1932, height: 828, deviceScaleFactor: 1 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({
    path: outPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1932, height: 828 },
  });
  console.log('Wrote', outPath);
} finally {
  await browser.close();
}
