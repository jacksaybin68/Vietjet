#!/usr/bin/env node
/**
 * Probe tạm: dải pill "Một chiều / Khứ hồi / Nhiều chặng" trên TRANG TÌM
 * VÉ của site thật (desktop 1440) — chỗ mà nó thực sự hiện ra.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-searchpage-pill.json
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
  'official-searchpage-pill.json'
);
const URL_OFFICIAL =
  process.argv[2] || 'https://newweb.vietjetair.com/vi/booking/search?from=HAN&to=SGN';
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
  await new Promise((r) => setTimeout(r, 10000));

  const data = await page.evaluate(() => {
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
    const out = { url: location.href };
    const trip = Array.from(document.querySelectorAll('button')).filter((b) =>
      /^(Một chiều|Khứ hồi|Nhiều chặng)$/.test((b.innerText || '').trim())
    );
    out.trip = trip.map((b) => {
      const chain = [];
      let n = b;
      for (let i = 0; i < 5 && n; i += 1) {
        chain.push(info(n));
        n = n.parentElement;
      }
      return chain;
    });
    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    out.cta = info(cta);
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
