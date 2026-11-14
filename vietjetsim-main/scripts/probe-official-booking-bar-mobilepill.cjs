#!/usr/bin/env node
/**
 * Probe tạm: mọi node chứa chữ "Một chiều / Khứ hồi / Nhiều chặng" ở mobile,
 * kèm hình học thật (bỏ qua các bản `display:none`).
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-mobilepill.json
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const OUT = path.resolve(
  __dirname,
  '..',
  'docs',
  'qa',
  '2026-11-13-vietjet-measure',
  'official-booking-bar-mobilepill.json'
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
    const info = (el) => {
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 44),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        visibility: c.visibility,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        padding: c.padding,
        gridCols: c.gridTemplateColumns,
        gap: c.gap,
      };
    };
    const out = {};
    const matches = Array.from(document.querySelectorAll('button,span,div,p,label,a')).filter(
      (el) => /^(Một chiều|Khứ hồi|Nhiều chặng)$/.test((el.innerText || '').trim())
    );
    out.matches = matches.map((el) => {
      const chain = [];
      let n = el;
      for (let i = 0; i < 6 && n; i += 1) {
        chain.push(info(n));
        n = n.parentElement;
      }
      return chain;
    });

    // Khung trắng chứa form ở mobile: lấy cha của nút "Hành khách" hiện hữu.
    const pax = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.innerText || '').trim().startsWith('Hành khách')
    );
    if (pax) {
      const chain = [];
      let n = pax;
      for (let i = 0; i < 6 && n; i += 1) {
        chain.push(info(n));
        n = n.parentElement;
      }
      out.paxChain = chain;
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
