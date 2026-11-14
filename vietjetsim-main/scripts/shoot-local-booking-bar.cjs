#!/usr/bin/env node
/** Chụp ảnh dải đặt vé local (desktop + mobile) để so sánh bằng mắt. */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

const BASE = (process.env.MEASURE_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  // Desktop: crop 1200×120 quanh dải đặt vé.
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({
    path: '/tmp/local-bar-desktop.png',
    clip: { x: 110, y: 775, width: 1220, height: 130 },
  });
  await page.screenshot({ path: '/tmp/local-home-desktop.png' });
  await page.close();

  // Mobile: crop 390×160 quanh thẻ đỏ.
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await m.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await m.screenshot({
    path: '/tmp/local-bar-mobile.png',
    clip: { x: 0, y: 460, width: 390, height: 170 },
  });
  await m.close();

  await browser.close();
  console.log('đã chụp: /tmp/local-bar-desktop.png, /tmp/local-bar-mobile.png');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
