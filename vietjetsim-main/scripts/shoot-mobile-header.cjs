#!/usr/bin/env node
/**
 * Chụp riêng vùng đầu trang (header + thanh thông báo) ở mobile 390×844 để so
 * chi tiết từng pixel giữa site thật và bản mô phỏng.
 *
 * Dùng: node scripts/shoot-mobile-header.cjs <official|sim>
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const MODE = process.argv[2] || 'official';
const OUT_DIR = path.join(__dirname, '..', '.screenshots-mobile');
const URL =
  MODE === 'official'
    ? process.env.OFFICIAL_URL || 'https://www.vietjetair.com/vi/'
    : process.env.SIM_URL || 'http://127.0.0.1:4028/trang-chu';

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
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.evaluate(() => {
    document
      .querySelectorAll('[aria-label="Thông báo cookie"], [id*="cookie"], [class*="cookie"]')
      .forEach((el) => el.remove());
  });
  await new Promise((r) => setTimeout(r, 300));

  await page.screenshot({
    path: path.join(OUT_DIR, `${MODE}-mobile-top.png`),
    clip: { x: 0, y: 0, width: 390, height: 110 },
  });
  await page.screenshot({
    path: path.join(OUT_DIR, `${MODE}-mobile-booking.png`),
    clip: { x: 0, y: 330, width: 390, height: 400 },
  });
  console.log('Đã lưu ảnh crop:', OUT_DIR);
  await browser.close();
})();
