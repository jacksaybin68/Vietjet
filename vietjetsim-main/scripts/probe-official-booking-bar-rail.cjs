#!/usr/bin/env node
/**
 * Đo CHI TIẾT các phần tử bên trong rail dịch vụ và cụm nút 24×24 ở cuối
 * dải đặt vé (desktop 1440×900 của site thật).
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-rail.json
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
  'official-booking-bar-rail.json'
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

  const data = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 36),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        justify: c.justifyContent,
        align: c.alignItems,
        gap: c.gap,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        padding: c.padding,
        border: c.border,
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));

    const out = { viewport: 'desktop-1440' };

    // ── Rail: 4 nút dịch vụ, dò bên trong từng nút ───────────────────────
    const railBtn = all('button').find((b) => (b.innerText || '').trim() === 'Đặt vé');
    out.railButtons = all('button')
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.top >= 780 && r.bottom <= 830 && r.width > 100;
      })
      .map((b) => ({
        button: info(b),
        children: Array.from(b.children).map(info),
        descendants: all('span,svg,p,i')
          .filter((s) => b.contains(s))
          .map(info),
      }));

    // ── Cụm nút 24×24 ở giữa form (x≈804) ───────────────────────────────
    out.smallButtons = all('button')
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return Math.abs(r.width - 24) <= 1 && Math.abs(r.height - 24) <= 1 && r.top > 800;
      })
      .map((b) => ({ button: info(b), children: Array.from(b.children).map(info) }));

    // ── Ô "Ngày đi" — dò bên trong ──────────────────────────────────────
    const dateBtn = all('button').find((b) => /^Ngày đi/i.test((b.innerText || '').trim()));
    out.dateCell = dateBtn
      ? { button: info(dateBtn), children: Array.from(dateBtn.children).map(info) }
      : null;

    // ── Ô "Hành khách" — dò bên trong ───────────────────────────────────
    const paxBtn = all('button').find((b) => /^Hành khách/i.test((b.innerText || '').trim()));
    out.paxCell = paxBtn
      ? { button: info(paxBtn), children: Array.from(paxBtn.children).map(info) }
      : null;

    // ── Ô "Từ" — dò bên trong ───────────────────────────────────────────
    const fromBtn = all('button').find((b) => /^Từ/i.test((b.innerText || '').trim()));
    out.fromCell = fromBtn
      ? { button: info(fromBtn), children: Array.from(fromBtn.children).map(info) }
      : null;

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
