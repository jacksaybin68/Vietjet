#!/usr/bin/env node
/**
 * Probe tạm: xác minh viền đỏ 5px quanh hàng tìm kiếm của site thật.
 *
 * Hai nguồn kiểm chứng:
 *  1. `elementFromPoint` tại mép trái/phải — cho biết phần tử nào thật sự
 *     được vẽ ở đó (viền đỏ hay nền trắng).
 *  2. Dải pixel ngang tại giữa hàng — in ra để đọc màu bằng mắt.
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';

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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  await page.evaluate(() => {
    document.querySelectorAll('[class*="cookie"], .custom-modal, .aip-chat-box').forEach((el) => {
      el.style.display = 'none';
    });
  });

  const bar = await page.evaluate(() => {
    const cta = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Tìm chuyến bay'
    );
    let el = cta;
    while (el && getComputedStyle(el).backgroundColor !== 'rgba(255, 255, 255, 0.9)') {
      el = el.parentElement;
    }
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  const shot = await page.screenshot({
    clip: { x: bar.x, y: bar.y, width: bar.w, height: bar.h },
    encoding: 'base64',
  });

  const report = await page.evaluate(
    async (b64, barBox) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const row = [];
      for (let x = 0; x < 14; x += 1) {
        const d = ctx.getImageData(x, 30, 1, 1).data;
        row.push(`${x}:${d[0]},${d[1]},${d[2]}`);
      }
      const rowRight = [];
      for (let x = barBox.w - 14; x < barBox.w; x += 1) {
        const d = ctx.getImageData(x, 30, 1, 1).data;
        rowRight.push(`${x}:${d[0]},${d[1]},${d[2]}`);
      }
      const col = [];
      for (let y = 0; y < barBox.h; y += 1) {
        const d = ctx.getImageData(600, y, 1, 1).data;
        col.push(`${y}:${d[0]},${d[1]},${d[2]}`);
      }

      const probe = (px, py) => {
        const el = document.elementFromPoint(px, py);
        if (!el) return null;
        const c = getComputedStyle(el);
        return {
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 30),
          bg: c.backgroundColor,
          borderLeft: c.borderLeft,
          borderBottom: c.borderBottom,
        };
      };

      return {
        rowLeft: row,
        rowRight,
        colMiddle: col,
        atLeftEdge: probe(barBox.x + 2, barBox.y + 30),
        atLeftEdge3: probe(barBox.x + 3, barBox.y + 30),
        atInside: probe(barBox.x + 8, barBox.y + 30),
        atBottom: probe(barBox.x + 600, barBox.y + barBox.h - 2),
        atBottom2: probe(barBox.x + 600, barBox.y + barBox.h - 7),
      };
    },
    shot,
    bar
  );

  console.log(JSON.stringify({ bar, ...report }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
