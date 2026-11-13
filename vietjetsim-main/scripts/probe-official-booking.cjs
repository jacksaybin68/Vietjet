#!/usr/bin/env node
/**
 * probe-official-booking.cjs — dò cấu trúc trang Đặt vé của site thật
 * (newweb.vietjetair.com/vi/pages/booking-search) sau khi SPA render xong.
 *
 * Ghi JSON số đo vào docs/qa/2026-11-13-vietjet-measure/official-booking-detail.json
 * Chỉ ghi SỐ ĐO, không tải asset/CSS/font về repo.
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
  'official-booking-detail.json'
);
const URL_OFFICIAL =
  'https://newweb.vietjetair.com/vi/pages/booking-search?departAirport=SGN&arrivalAirport=DAD&departDate=2026-11-20&adult=1&child=0&infant=0';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PROBE = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      lh: c.lineHeight,
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage.slice(0, 200),
      radius: c.borderRadius,
      padding: c.padding,
      shadow: c.boxShadow.slice(0, 120),
      tt: c.textTransform,
      display: c.display,
    };
  };
  const vis = (e) => e && e.offsetParent !== null;
  const all = (s) => Array.from(document.querySelectorAll(s));
  const byText = (sel, re) => all(sel).find((el) => re.test(el.textContent || ''));

  // Nhóm phần tử theo class chứa từ khoá đặc trưng của từng khối.
  const group = (re) => all('[class]').filter((el) => re.test(el.className || ''));

  const dateBtns = all('button')
    .filter(vis)
    .filter((b) => /\d{1,2}\/\d{1,2}/.test(b.textContent || ''))
    .slice(0, 3)
    .map(box);

  const fareTabs = all('button')
    .filter(vis)
    .filter((b) => /^(eco|deluxe|skyboss|business)$/i.test((b.textContent || '').trim()))
    .slice(0, 6)
    .map(box);

  const priceNodes = all('[class*="price"],[class*="Price"]').filter(vis).slice(0, 6).map(box);

  const h3 = all('h3').filter(vis).slice(0, 4).map(box);
  const h4 = all('h4').filter(vis).slice(0, 6).map(box);
  const h5 = all('h5').filter(vis).slice(0, 6).map(box);

  const buttons = all('button')
    .filter(vis)
    .map(box)
    .filter((b) => b && /tiếp|chọn|đi tiếp/i.test(b.text || ''))
    .slice(0, 6);

  return {
    url: location.href,
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500),
    dateBtns,
    fareTabs,
    priceNodes,
    h3,
    h4,
    h5,
    buttons,
    aside: box(document.querySelector('aside')),
    header: box(document.querySelector('header')),
    classHints: {
      dateStrip: group(/date/i)
        .slice(0, 6)
        .map((e) => (e.className || '').toString().slice(0, 120)),
      fare: group(/fare|cabin/i)
        .slice(0, 6)
        .map((e) => (e.className || '').toString().slice(0, 120)),
      card: group(/flight|journey|card/i)
        .slice(0, 8)
        .map((e) => (e.className || '').toString().slice(0, 120)),
    },
    total: byText('div,span,p', /Tổng tiền/i) ? box(byText('div,span,p', /Tổng tiền/i)) : null,
  };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  try {
    await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 20000));
    const data = await page.evaluate(PROBE);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
    console.log(`Đã ghi ${OUT}`);
  } catch (err) {
    console.error('LỖI:', err.message);
  } finally {
    await browser.close();
  }
})();
