#!/usr/bin/env node
/**
 * Chụp ảnh màn hình mobile (390×844) để đối chiếu trực quan giữa site thật
 * và bản mô phỏng.
 *
 * Dùng: node scripts/shoot-mobile.cjs <official|sim>
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

  // Ẩn các lớp phủ không liên quan (cookie, chat) để ảnh chỉ còn giao diện.
  await page.evaluate(() => {
    document
      .querySelectorAll('[aria-label="Thông báo cookie"], .vj-cookie, [id*="cookie"]')
      .forEach((el) => el.remove());
  });
  await new Promise((r) => setTimeout(r, 400));

  await page.screenshot({ path: path.join(OUT_DIR, `${MODE}-mobile-viewport.png`) });
  await page.screenshot({
    path: path.join(OUT_DIR, `${MODE}-mobile-full.png`),
    fullPage: false,
  });
  console.log('Đã lưu ảnh:', OUT_DIR);
  await browser.close();
})();
