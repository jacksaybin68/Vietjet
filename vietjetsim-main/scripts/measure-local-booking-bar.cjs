#!/usr/bin/env node
/**
 * Đo hình học dải đặt vé của app LOCAL (dùng để đối chiếu với site thật).
 *
 * Dùng: MEASURE_BASE_URL=http://127.0.0.1:4028 node scripts/measure-local-booking-bar.cjs
 *
 * Cấu trúc đo bám theo site thật (đo 14/11/2026, viewport 1440×900):
 *   - Tầng 1: rail đỏ 1200×40px, 4 nút dịch vụ.
 *   - Tầng 2: hàng tìm kiếm trắng 1200×69px.
 *   - Ô nhập: Từ (235) → hoán đổi (24) → Đến (235) → Ngày đi (222) →
 *     Hành khách (259) → CTA (174×44).
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const BASE = (process.env.MEASURE_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
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

const PROBE = () => {
  const info = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 40),
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      ff: c.fontFamily.split(',')[0],
      color: c.color,
      bg: c.backgroundColor,
      radius: c.borderRadius,
      padding: c.padding,
      display: c.display,
    };
  };
  const out = {};
  out.header = info(document.querySelector('header'));
  out.hero = info(document.querySelector('section'));
  out.shell = info(document.querySelector('.vj-booking-shell'));
  out.rail = info(document.querySelector('.vj-booking-rail'));
  out.bar = info(document.querySelector('.vj-booking-bar'));
  out.railTabs = Array.from(document.querySelectorAll('.vj-booking-rail__tab')).map(info);
  out.fields = info(document.querySelector('.vj-booking-fields'));
  out.cta = info(
    Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    )
  );
  out.swap = info(
    Array.from(document.querySelectorAll('button')).find((b) =>
      /Đổi điểm khởi hành/i.test(b.getAttribute('aria-label') || '')
    )
  );
  for (const label of ['Điểm khởi hành', 'Điểm đến', 'Ngày đi', 'Số hành khách']) {
    out[label] = info(document.querySelector(`[aria-label="${label}"]`));
  }
  out.docScrollWidth = document.documentElement.scrollWidth;
  out.clientWidth = document.documentElement.clientWidth;
  return out;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  for (const vp of [
    { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
    { name: 'mobile-390', width: 390, height: 844, mobile: true },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });
    await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    const data = await page.evaluate(PROBE);
    console.log(`\n=== ${vp.name} ===`);
    console.log(JSON.stringify(data, null, 2));
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
