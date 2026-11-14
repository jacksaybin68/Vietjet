#!/usr/bin/env node
/**
 * Kiểm tra trạng thái bung/thu gọn của thẻ đặt vé MOBILE (390×844) ở app
 * LOCAL — đối chiếu với site thật:
 *   - Thu gọn: thẻ đỏ 366×130px (x=12, y=477), hộp trắng 354×72px (y=529).
 *   - Mở rộng: thẻ đỏ cao 507px, hộp trắng 354×449px, CTA 314×52px.
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
    return {
      cls: (el.className || '').toString().slice(0, 30),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const out = {};
  out.shell = info(document.querySelector('.vj-booking-shell'));
  out.rail = info(document.querySelector('.vj-booking-rail'));
  out.bar = info(document.querySelector('.vj-booking-bar'));
  out.fields = info(document.querySelector('.vj-booking-fields'));
  out.date = info(document.querySelector('.vj-booking-date'));
  out.pax = info(document.querySelector('.vj-booking-pax'));
  out.cta = info(
    Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    )
  );
  out.scrollWidth = document.documentElement.scrollWidth;
  out.clientWidth = document.documentElement.clientWidth;
  return out;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));

  console.log('=== mobile-390 collapsed ===');
  console.log(JSON.stringify(await page.evaluate(PROBE), null, 2));

  // Bấm vào ô "Từ" để bung thẻ.
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Điểm khởi hành"]');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  console.log('=== mobile-390 expanded ===');
  console.log(JSON.stringify(await page.evaluate(PROBE), null, 2));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
