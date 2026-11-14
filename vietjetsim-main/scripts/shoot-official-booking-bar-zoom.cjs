#!/usr/bin/env node
/**
 * Chụp ảnh vùng dải đặt vé của site thật để soi bằng mắt: viền đỏ 5px
 * quanh hàng tìm kiếm có thật không, và khoảng cách giữa các ô.
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';
const OUT = process.argv[3] || '/tmp/official-bar.png';

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

  await page.evaluate(() => {
    document.querySelectorAll('[class*="cookie"], .custom-modal, .aip-chat-box').forEach((el) => {
      el.style.display = 'none';
    });
  });

  await page.screenshot({ path: OUT, clip: { x: 100, y: 770, width: 1240, height: 140 } });
  console.log('đã lưu', OUT);
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
