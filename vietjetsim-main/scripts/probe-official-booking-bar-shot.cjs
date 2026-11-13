#!/usr/bin/env node
/**
 * Chụp ảnh vùng dải đặt vé của site thật (newweb, desktop 1440×900) để đối
 * chiếu thị giác với bản dựng trong repo.
 *
 * Ảnh: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-desktop.png
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'qa', '2026-11-13-vietjet-measure');
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';
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
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  // Tắt lớp che cookie để không che mất thanh đặt vé.
  await page.evaluate(() => {
    document
      .querySelectorAll('[class*="cookie"], [id*="cookie"], [aria-label*="ookie" i]')
      .forEach((el) => {
        if (el instanceof HTMLElement) el.style.display = 'none';
      });
  });
  await new Promise((r) => setTimeout(r, 800));

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1) Toàn bộ hero (0..950)
  await page.screenshot({
    path: path.join(OUT_DIR, 'official-hero-desktop.png'),
    clip: { x: 0, y: 40, width: 1440, height: 880 },
  });

  // 2) Riêng dải đặt vé (rail + form)
  await page.screenshot({
    path: path.join(OUT_DIR, 'official-booking-bar-desktop.png'),
    clip: { x: 100, y: 770, width: 1240, height: 135 },
  });

  console.log('đã chụp 2 ảnh vào', OUT_DIR);
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
