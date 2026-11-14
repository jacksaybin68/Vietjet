#!/usr/bin/env node
/**
 * Probe tạm: sau khi bấm ô "Ngày đi" trên site thật, dải pill "Một chiều /
 * Khứ hồi / Nhiều chặng" có hiện ra không, và nằm ở đâu.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-tripafter.json
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
  'official-booking-bar-tripafter.json'
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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  const before = await page.evaluate(() => {
    const trip = Array.from(document.querySelectorAll('button')).filter((b) =>
      /^(Một chiều|Khứ hồi|Nhiều chặng)$/.test((b.innerText || '').trim())
    );
    return trip.map((b) => {
      const r = b.getBoundingClientRect();
      const chain = [];
      let n = b;
      for (let i = 0; i < 4 && n; i += 1) {
        const c = getComputedStyle(n);
        chain.push({
          cls: (n.className || '').toString().slice(0, 26),
          display: c.display,
          w: Math.round(n.getBoundingClientRect().width),
          h: Math.round(n.getBoundingClientRect().height),
        });
        n = n.parentElement;
      }
      return { text: b.innerText.trim(), w: Math.round(r.width), chain };
    });
  });

  const after = await page.evaluate(async () => {
    const dateBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith('Ngày đi')
    );
    if (dateBtn) dateBtn.click();
    await new Promise((r) => setTimeout(r, 3000));
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
        radius: c.borderRadius,
        padding: c.padding,
      };
    };
    const out = {};
    const trip = Array.from(document.querySelectorAll('button')).filter((b) =>
      /^(Một chiều|Khứ hồi|Nhiều chặng)$/.test((b.innerText || '').trim())
    );
    out.trip = trip.map((b) => {
      const chain = [];
      let n = b;
      for (let i = 0; i < 4 && n; i += 1) {
        chain.push(info(n));
        n = n.parentElement;
      }
      return chain;
    });
    // Popover lịch: phần tử dưới con trỏ chuột / z-index cao.
    const poppers = Array.from(document.querySelectorAll('body *')).filter((el) => {
      const c = getComputedStyle(el);
      return (
        (c.position === 'fixed' || c.position === 'absolute') &&
        Number(c.zIndex || '0') > 100 &&
        el.getBoundingClientRect().width > 200
      );
    });
    out.poppers = poppers.slice(0, 6).map((el) => ({
      self: info(el),
      kids: Array.from(el.children).slice(0, 12).map(info),
    }));
    return out;
  });

  const data = { before, after };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
