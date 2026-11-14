#!/usr/bin/env node
/**
 * Probe tạm: chiều rộng từng tab trên rail đỏ MOBILE của site thật.
 *
 * Ghi: docs/qa/2026-11-15-vietjet-measure/official-booking-bar-mobilerail.json
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const OUT = path.resolve(
  __dirname,
  '..',
  'docs',
  'qa',
  '2026-11-15-vietjet-measure',
  'official-booking-bar-mobilerail.json'
);
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
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(() => {
    // Dọn overlay cookie để không che khối đo.
    document.querySelectorAll('div,section').forEach((el) => {
      const t = (el.innerText || '').toLowerCase();
      if (t.includes('cookie') && el.getBoundingClientRect().width > 200) el.remove();
    });

    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 30),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundColor,
        padding: c.padding,
        gap: c.gap,
        overflowX: c.overflowX,
      };
    };

    const out = {};
    const bookTab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    let red = bookTab;
    while (red && getComputedStyle(red).backgroundColor !== 'rgb(236, 32, 41)') {
      red = red.parentElement;
    }
    out.red = info(red);
    out.redKids = Array.from(red.children).map(info);
    // Tất cả phần tử trong rail (nút/li/a) nằm cùng hàng ngang với "Đặt vé".
    if (bookTab) {
      const rail = bookTab.parentElement;
      out.rail = info(rail);
      out.railKids = Array.from(rail.children).map(info);
    }
    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
