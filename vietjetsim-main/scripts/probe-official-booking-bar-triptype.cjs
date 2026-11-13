#!/usr/bin/env node
/**
 * Tìm control "Khứ hồi / Một chiều" và các trạng thái khác trong dải đặt vé
 * ngang (desktop 1440×900 của site thật).
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-triptype.json
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
  'official-booking-bar-triptype.json'
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
        cls: (el.className || '').toString().slice(0, 40),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
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
    const out = {};

    // Tìm mọi chữ "Khứ hồi" / "Một chiều" trên trang.
    out.tripTypeText = all('button,label,span,div,p,a')
      .filter((el) => {
        const t = (el.innerText || '').trim();
        return /^(Khứ hồi|Một chiều|Nhiều chặng)$/i.test(t);
      })
      .map(info);

    // Mọi phần tử có nằm gần vùng thanh (y 770..900) — kể cả ngoài thanh.
    out.nearBar = all('button,label,span,div,p,a,input')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const t = (el.innerText || '').trim();
        return (
          r.top >= 700 &&
          r.top <= 900 &&
          r.width > 0 &&
          r.height > 0 &&
          t.length > 0 &&
          t.length < 40 &&
          el.children.length === 0
        );
      })
      .map(info);

    // Ảnh chụp hero + khoảng trắng dưới thanh: vùng nào bắt đầu nội dung kế.
    const sections = all('section,div')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 60 && r.width >= 1400;
      })
      .slice(0, 12)
      .map(info);

    out.sections = sections;

    // Cụm switch 24×24 ở x=804: ấn thử để xem mở gì.
    const chevrons = all('button').filter((b) => {
      const r = b.getBoundingClientRect();
      return Math.abs(r.width - 24) <= 1 && r.x > 780 && r.x < 840 && r.top > 800;
    });

    out.chevronSvg = chevrons.map((b) => {
      const svg = b.querySelector('svg');
      return { button: info(b), svg: info(svg), path: svg ? svg.innerHTML.slice(0, 160) : null };
    });

    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log('--- tripTypeText ---');
  for (const t of data.tripTypeText) console.log(JSON.stringify(t));
  console.log('--- chevronSvg ---');
  for (const c of data.chevronSvg) console.log(c.button.x, c.button.y, c.svg && c.svg.path);
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
