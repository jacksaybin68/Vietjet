#!/usr/bin/env node
/**
 * probe-official-flow.cjs — chạy LUỒNG THẬT trên site Vietjet để đo được trang
 * "Chọn chuyến bay" CÓ dữ liệu chuyến bay (probe tĩnh không tải được danh
 * sách chuyến vì SPA cần đi qua form tìm kiếm ở trang chủ).
 *
 * Bước:
 *   1. Mở trang chủ, điền điểm đi/đến/ngày, bấm "Tìm chuyến bay".
 *   2. Chờ URL chuyển sang /vi/select-flight và danh sách chuyến xuất hiện.
 *   3. Đo: băng H1 đỏ cột trái, ô hạng vé (141×96), panel tổng, thanh đáy,
 *      nút "Đi tiếp" (127×39) và font chữ tương ứng.
 *
 * Ghi JSON số đo vào docs/qa/2026-11-13-vietjet-measure/official-flow.json
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
  'official-flow.json'
);

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

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
      font: c.fontFamily.split(',')[0],
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.bgImageOf || c.backgroundImage.slice(0, 200),
      radius: c.borderRadius,
      border: c.border,
      padding: c.padding,
      shadow: c.boxShadow.slice(0, 140),
      tt: c.textTransform,
    };
  };
  const vis = (e) => e && e.offsetParent !== null;
  const all = (s) => Array.from(document.querySelectorAll(s));
  const byText = (sel, re) => all(sel).find((el) => re.test((el.textContent || '').trim()));

  // --- Băng tiêu đề đỏ cột trái (H1 "LỰA CHỌN CHUYẾN BAY") ---
  const redBand = all('div,h1,h2,h3,p,span')
    .filter(vis)
    .find((el) => {
      const c = getComputedStyle(el);
      return (
        /lựa chọn chuyến bay|chon chuyen bay/i.test(el.textContent || '') &&
        c.backgroundColor !== 'rgba(0, 0, 0, 0)'
      );
    });
  const h1Like = redBand
    ? all('*')
        .filter(vis)
        .filter((el) => (el.textContent || '').trim().toUpperCase() === 'LỰA CHỌN CHUYẾN BAY')
        .map(box)
        .slice(0, 4)
    : [];

  // --- Ô hạng vé: ô chứa số tiền + mã tiền tệ ---
  const fareCells = all('div,li,td')
    .filter(vis)
    .filter((el) => {
      const t = (el.textContent || '').trim();
      const r = el.getBoundingClientRect();
      return /VND/i.test(t) && t.length < 30 && r.width > 80 && r.width < 200 && r.height > 60;
    })
    .map(box)
    .slice(0, 10);

  // --- Nhãn hạng vé (ECO / DELUXE / SKYBOSS / BUSINESS) ---
  const fareLabels = all('div,span,p,button')
    .filter(vis)
    .filter((el) => /^(eco|deluxe|skyboss|business)$/i.test((el.textContent || '').trim()))
    .map(box)
    .slice(0, 10);

  // --- "Hết chỗ" ---
  const soldOut = all('div,span,p,button')
    .filter(vis)
    .filter(
      (el) => /hết chỗ/i.test(el.textContent || '') && (el.textContent || '').trim().length < 24
    )
    .map(box)
    .slice(0, 4);

  // --- Panel tổng bên phải ---
  const panelHead = byText('h1,h2,h3,div', /thông tin đặt chỗ/i);
  const panel = panelHead
    ? box(panelHead.closest('aside') || panelHead.parentElement?.parentElement)
    : null;
  const panelBars = all('div,h4,span')
    .filter(vis)
    .filter((el) => {
      const c = getComputedStyle(el);
      return (
        c.backgroundColor === 'rgb(241, 241, 241)' &&
        el.getBoundingClientRect().width > 250 &&
        el.getBoundingClientRect().height >= 40 &&
        el.getBoundingClientRect().height <= 60
      );
    })
    .map(box)
    .slice(0, 8);

  // --- Nút "Đi tiếp" ---
  const ctaEl = byText('button,a', /^đi tiếp$/i);
  const cta = ctaEl ? box(ctaEl) : null;
  const ctaParent = ctaEl ? box(ctaEl.parentElement) : null;

  // --- Thanh đáy (chứa Tổng tiền + Chi tiết + Đi tiếp) ---
  const totalEl = byText('div,span,p,h4', /^tổng tiền$/i);
  const bottomBar = totalEl ? box(totalEl.closest('div')?.parentElement?.parentElement) : null;
  const bottomRow = totalEl
    ? (() => {
        let n = totalEl;
        for (let i = 0; i < 4 && n; i++) {
          const r = n.getBoundingClientRect();
          if (r.width > 900) return box(n);
          n = n.parentElement;
        }
        return null;
      })()
    : null;

  return {
    url: location.href,
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 3000),
    h1: h1Like,
    redBand: redBand ? box(redBand) : null,
    fareCells,
    fareLabels,
    soldOut,
    panel,
    panelBars,
    cta,
    ctaParent,
    bottomBar,
    bottomRow,
    header: box(document.querySelector('header')),
  };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  await page.goto('https://newweb.vietjetair.com/vi/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await page.waitForFunction(() => (document.body.innerText || '').includes('Tìm chuyến bay'), {
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  // Bấm nút tìm chuyến bay (site tự điền sẵn điểm đi/đến mặc định).
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      /Tìm chuyến bay/i.test(x.textContent || '')
    );
    if (b) {
      b.click();
      return true;
    }
    return false;
  });
  console.log('đã bấm Tìm chuyến bay:', clicked);

  // Chờ sang trang chọn chuyến bay và có danh sách chuyến.
  await page
    .waitForFunction(() => /select-flight/i.test(location.href), { timeout: 90000 })
    .catch(() => console.log('KHÔNG chuyển sang select-flight'));
  await new Promise((r) => setTimeout(r, 15000));

  const data = await page.evaluate(PROBE);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2).slice(0, 8000));
  console.log(`\nĐã ghi ${OUT}`);
  await browser.close();
})();
