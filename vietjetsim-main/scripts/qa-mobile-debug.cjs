#!/usr/bin/env node
/** Kiểm tra nhanh các breakpoint đang áp dụng ở viewport mobile. */
const puppeteer = require('puppeteer-core');

const BASE = process.env.SIM_URL || 'http://127.0.0.1:4028';

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
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/trang-chu`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));
  const out = await page.evaluate(() => {
    const dots = document.querySelector('[data-testid="hero-slider-dots"]');
    const panel = document.querySelector('.vj-booking-panel');
    const nav = document.querySelector('[data-testid="mobile-bottom-nav"]');
    const R = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    const cs = (e) => (e ? getComputedStyle(e) : null);
    return {
      innerWidth: window.innerWidth,
      docWidth: document.documentElement.clientWidth,
      mq1024: window.matchMedia('(min-width: 1024px)').matches,
      mq640: window.matchMedia('(min-width: 640px)').matches,
      dotsCls: dots ? dots.className : null,
      dotsBox: R(dots),
      dotsTop: dots ? cs(dots).top : null,
      panelBox: R(panel),
      panelRadius: panel ? cs(panel).borderRadius : null,
      navBox: R(nav),
      navRadius: nav ? cs(nav).borderRadius : null,
      navClass: nav ? nav.className : null,
      headerBox: R(document.querySelector('header')),
      headerPos: cs(document.querySelector('header'))?.position,
      headerTop: cs(document.querySelector('header'))?.top,
      headerClass: document.querySelector('header')?.className,
      logoImgs: Array.from(document.querySelectorAll('header img')).map((i) => ({
        cls: i.className,
        box: R(i),
      })),
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
