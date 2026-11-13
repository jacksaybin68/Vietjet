#!/usr/bin/env node
/**
 * Tìm chỗ site thật đặt control "Khứ hồi / Một chiều / Nhiều chặng" trong
 * dải đặt vé ngang (desktop 1440×900).
 *
 * Ở lần đo trước, ba nút đó có kích thước 0×0 — nghĩa là chúng nằm trong
 * một popover đang đóng. Script này dò cả chuỗi cha (để biết bị ẩn bằng gì)
 * và thử bấm vào các ô để xem popover nào mở ra chứa chúng.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-triptype2.json
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
  'official-booking-bar-triptype2.json'
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

  const data = await page.evaluate(async () => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 44),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        visibility: c.visibility,
        opacity: c.opacity,
        position: c.position,
        zIndex: c.zIndex,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        padding: c.padding,
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));
    const out = {};

    // Chuỗi cha của nút "Khứ hồi" (nút có 0×0).
    const tripBtn = all('button').find((b) => (b.innerText || '').trim() === 'Khứ hồi');
    out.tripChain = [];
    let n = tripBtn;
    for (let i = 0; i < 7 && n; i++) {
      out.tripChain.push(info(n));
      n = n.parentElement;
    }

    // Thử bấm vào từng ô trong thanh và xem popover nào mở ra.
    const cta = all('button').find((b) => /Tìm chuyến bay/i.test(b.innerText || ''));
    let bar = cta;
    for (let i = 0; i < 4 && bar; i++) bar = bar.parentElement;

    const before = all('body *').length;
    const results = {};

    const targets = [
      ['from', /^Từ/i],
      ['to', /^Đến/i],
      ['date', /^Ngày đi/i],
      ['pax', /^Hành khách/i],
    ];

    for (const [name, re] of targets) {
      const btn = all('button').find((b) => re.test((b.innerText || '').trim()));
      if (!btn) {
        results[name] = 'không tìm thấy nút';
        continue;
      }
      btn.click();
      await new Promise((r) => setTimeout(r, 600));
      const tripNow = all('button').find((b) => (b.innerText || '').trim() === 'Khứ hồi');
      const visible = tripNow ? tripNow.getBoundingClientRect().width > 0 : false;
      // Liệt kê các popover mới xuất hiện (phần tử role=dialog / .MuiPopover-root).
      const poppers = all('[role="dialog"], [role="listbox"], .MuiPopover-root')
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < 900;
        })
        .map((el) => ({
          info: info(el),
          text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 220),
        }));
      results[name] = { tripVisible: visible, poppers };
      // Đóng popover lại.
      document.body.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    out.afterClicks = results;
    out.nodeDelta = all('body *').length - before;

    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log('--- tripChain ---');
  for (const c of data.tripChain) {
    console.log(
      `${c.tag} display=${c.display} vis=${c.visibility} pos=${c.position} ${c.w}x${c.h} @${c.x},${c.y} ${JSON.stringify(c.text.slice(0, 40))}`
    );
  }
  console.log('--- afterClicks ---');
  console.log(JSON.stringify(data.afterClicks, null, 2).slice(0, 3000));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
