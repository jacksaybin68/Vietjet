#!/usr/bin/env node
/**
 * Probe tạm (desktop): chi tiết rail đỏ, các ô nhập, nút hoán đổi, chevron và
 * font-family của từng phần tử trong thanh đặt vé ngang của site thật.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-details.json
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
  'official-booking-bar-details.json'
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
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 44),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        fs: c.fontSize,
        fw: c.fontWeight,
        ff: c.fontFamily,
        color: c.color,
        bg: c.backgroundColor,
        bgImage: c.backgroundImage.slice(0, 90),
        radius: c.borderRadius,
        padding: c.padding,
        margin: c.margin,
        gap: c.gap,
        flex: c.flex,
        justify: c.justifyContent,
        align: c.alignItems,
        border: c.border,
        textTransform: c.textTransform,
        lh: c.lineHeight,
        position: c.position,
        top: c.top,
        left: c.left,
      };
    };
    const out = {};

    // Rail đỏ: cha của nút "Đặt vé".
    const bookTab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    let rail = bookTab && bookTab.parentElement;
    while (rail && getComputedStyle(rail).backgroundColor !== 'rgb(236, 32, 41)') {
      rail = rail.parentElement;
    }
    out.rail = info(rail);
    out.railButtons = Array.from(document.querySelectorAll('button'))
      .filter((b) =>
        ['Đặt vé', 'Khách sạn', 'Skyshop', 'Đổi thưởng vé máy bay'].includes(
          (b.innerText || '').trim()
        )
      )
      .map((b) => ({ self: info(b), kids: Array.from(b.children).map(info) }));
    // Nội dung bên trong nút "Đặt vé" (icon 24×24).
    if (bookTab) {
      out.bookTabTree = (function walk(el, depth) {
        if (!el || depth > 3) return null;
        return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
      })(bookTab, 0);
    }

    // Nút hoán đổi: node 24×24 có nền #F3F1F1.
    const swap = Array.from(document.querySelectorAll('button')).find((b) => {
      const r = b.getBoundingClientRect();
      return Math.abs(r.width - 24) <= 1 && Math.abs(r.height - 24) <= 1 && r.x > 340 && r.x < 400;
    });
    out.swap = info(swap);
    out.swapTree = (function walk(el, depth) {
      if (!el || depth > 3) return null;
      return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
    })(swap, 0);

    // Nút chevron 24×24 bo góc 4px ở x≈804.
    const chev = Array.from(document.querySelectorAll('button')).find((b) => {
      const r = b.getBoundingClientRect();
      return Math.abs(r.width - 24) <= 1 && Math.abs(r.height - 24) <= 1 && r.x > 780 && r.x < 840;
    });
    out.chevron = info(chev);
    out.chevronTree = (function walk(el, depth) {
      if (!el || depth > 3) return null;
      return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
    })(chev, 0);

    // Ô "Từ": button 235×64.
    const fromBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').replace(/\s+/g, ' ').trim() === 'Từ Điểm khởi hành'
    );
    out.fromTree = (function walk(el, depth) {
      if (!el || depth > 3) return null;
      return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
    })(fromBtn, 0);

    // Nút "Hành khách".
    const paxBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith('Hành khách')
    );
    out.paxTree = (function walk(el, depth) {
      if (!el || depth > 3) return null;
      return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
    })(paxBtn, 0);

    // Nút CTA.
    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    out.ctaTree = (function walk(el, depth) {
      if (!el || depth > 3) return null;
      return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
    })(cta, 0);

    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log('done');
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
