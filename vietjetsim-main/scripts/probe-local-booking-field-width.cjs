#!/usr/bin/env node
/**
 * Probe tạm: vì sao ô "Từ"/"Đến" trong dải đặt vé không tràn hết ô của nó?
 * In computed style của nút + ô bọc + track lưới.
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_LOCAL = process.argv[2] || 'http://localhost:4028/trang-chu';

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
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_LOCAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 6000));

  const data = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 60),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        width: c.width,
        alignItems: c.alignItems,
        justifyContent: c.justifyContent,
        flexDirection: c.flexDirection,
        gridTemplateColumns: c.gridTemplateColumns,
        padding: c.padding,
      };
    };
    const grid = document.querySelector('.vj-booking-fields');
    const from = document.querySelector('[aria-label="Điểm khởi hành"]');
    const to = document.querySelector('[aria-label="Điểm đến"]');
    return {
      grid: info(grid),
      gridKids: grid ? Array.from(grid.children).map(info) : [],
      from: info(from),
      fromParent: info(from && from.parentElement),
      to: info(to),
      toParent: info(to && to.parentElement),
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
