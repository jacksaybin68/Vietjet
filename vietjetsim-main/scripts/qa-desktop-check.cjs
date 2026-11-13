#!/usr/bin/env node
/**
 * Kiểm tra nhanh vị trí các lớp phủ ở desktop (1440×900) — dùng để chắc chắn
 * các thay đổi cho mobile không làm lệch bố cục desktop đã nghiệm thu.
 */
const puppeteer = require('puppeteer-core');

const SIM = process.env.SIM_URL || 'http://127.0.0.1:4028/trang-chu';

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => require('node:fs').existsSync(p));
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
  await page.goto(SIM, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1200));
  const out = await page.evaluate(() => {
    const R = (e) => {
      const r = e.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    const res = {};
    const header = document.querySelector('header');
    res.header = header
      ? {
          box: R(header),
          pos: getComputedStyle(header).position,
          top: getComputedStyle(header).top,
        }
      : null;
    const scrim = document.querySelector('.vj-header-scrim');
    res.scrim = scrim ? { box: R(scrim) } : null;
    const logo = scrim ? scrim.querySelector('img') : null;
    res.logo = logo ? { box: R(logo) } : null;
    const announce = document.querySelector('[aria-label="Thông báo"]');
    res.announce = announce ? { box: R(announce) } : null;
    const hero = document.querySelector('section');
    res.hero = hero ? { box: R(hero) } : null;
    const imgs = Array.from(document.querySelectorAll('section img'));
    res.heroImg = imgs[0] ? R(imgs[0]) : null;
    return res;
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
