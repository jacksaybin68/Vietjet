#!/usr/bin/env node
/** Kiểm tra viền đỏ 5px của hàng tìm kiếm (local) — đối chiếu site thật. */
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
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));

  const data = await page.evaluate(() => {
    const bar = document.querySelector('.vj-booking-bar');
    const c = getComputedStyle(bar);
    const r = bar.getBoundingClientRect();
    const shell = document.querySelector('.vj-booking-shell').getBoundingClientRect();
    return {
      bar: { x: r.x, y: r.y, w: r.width, h: r.height },
      shell: { x: shell.x, y: shell.y, w: shell.width, h: shell.height },
      offsetWidth: bar.offsetWidth,
      clientWidth: bar.clientWidth,
      clientHeight: bar.clientHeight,
      boxSizing: c.boxSizing,
      borderLeft: c.borderLeft,
      borderRight: c.borderRight,
      borderBottom: c.borderBottom,
      borderTop: c.borderTop,
      radius: c.borderRadius,
      background: c.backgroundColor,
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
