#!/usr/bin/env node
/**
 * Probe tạm: hình học từng ô nhập trong dải đặt vé MOBILE (390×844) của site
 * thật — dùng để dựng lại widget ở breakpoint nhỏ.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-mobilefields.json
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
  'official-booking-bar-mobilefields.json'
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
        border: c.border,
      };
    };
    const out = {};

    // Khung trắng chứa form ở mobile.
    const pax = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith('Hành khách')
    );
    let card = pax;
    while (card && getComputedStyle(card).backgroundColor !== 'rgb(255, 255, 255)') {
      card = card.parentElement;
    }
    out.card = info(card);
    out.cardKids = Array.from(card.children).map(info);
    out.cardGrid = (function walk(el, depth) {
      if (!el || depth > 3) return null;
      return { self: info(el), kids: Array.from(el.children).map((c) => walk(c, depth + 1)) };
    })(card, 0);

    // Các ô nhập trong khung: tìm theo nhãn.
    const labels = ['Từ', 'Đến', 'Ngày đi', 'Hành khách'];
    out.fields = labels.map((label) => {
      const el = Array.from(card.querySelectorAll('button')).find((b) =>
        (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith(label)
      );
      return { label, info: info(el) };
    });

    // Nút CTA.
    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    out.cta = info(cta);
    out.ctaParent = info(cta && cta.parentElement);
    out.ctaParentParent = info(cta && cta.parentElement && cta.parentElement.parentElement);

    // Khối đỏ chứa rail.
    const bookTab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    let red = bookTab;
    while (red && getComputedStyle(red).backgroundColor !== 'rgb(236, 32, 41)') {
      red = red.parentElement;
    }
    out.red = info(red);
    out.redKids = Array.from(red.children).map(info);
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
