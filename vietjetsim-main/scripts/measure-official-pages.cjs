#!/usr/bin/env node
/**
 * measure-official-pages.cjs — đo cùng bộ câu hỏi với scripts/measure-parity-pages.cjs
 * nhưng trên SITE THẬT (newweb.vietjetair.com), rồi ghi JSON vào
 * docs/qa/2026-11-13-vietjet-measure/official-<route>-<viewport>.json
 *
 *   node scripts/measure-official-pages.cjs
 *
 * Chỉ ghi lại SỐ ĐO (kích thước / màu / font). Không tải asset, CSS hay font
 * của site thật về repo (theo AGENTS.md).
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const APP_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(APP_ROOT, 'docs', 'qa', '2026-11-13-vietjet-measure');
const BASE = 'https://newweb.vietjetair.com';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = [
  { slug: 'home', official: '/vi/' },
  { slug: 'my-search-booking', official: '/vi/my/search-booking' },
  { slug: 'checkin', official: '/vi/checkin' },
  {
    slug: 'booking-search',
    official:
      '/vi/pages/booking-search?departAirport=SGN&arrivalAirport=DAD&departDate=2026-11-20&adult=1&child=0&infant=0',
  },
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
];

const PROBE = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      color: c.color,
      bg: c.backgroundColor,
      radius: c.borderRadius,
      shadow: c.boxShadow,
    };
  };
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (e) => e && e.offsetParent !== null;

  const header = document.querySelector('header');
  const h1 = q('h1').find(vis) || null;
  const h2 = q('h2').find(vis) || null;
  const inputs = q('input')
    .filter(vis)
    .slice(0, 3)
    .map((i) => box(i.parentElement));
  const submit = q('button')
    .filter(vis)
    .find((b) => /tìm kiếm/i.test(b.textContent || ''));

  return {
    header: box(header),
    headerBg: header ? getComputedStyle(header).backgroundColor : null,
    headerRadius: header ? getComputedStyle(header).borderRadius : null,
    h1: box(h1),
    h2: box(h2),
    inputs,
    submit: box(submit),
  };
};

async function measure() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      try {
        await page.goto(BASE + route.official, {
          waitUntil: 'networkidle2',
          timeout: 120000,
        });
        await new Promise((r) => setTimeout(r, 3500));
        const data = await page.evaluate(PROBE);
        results.push({ route: route.slug, viewport: vp.name, ...data });
      } catch (err) {
        results.push({
          route: route.slug,
          viewport: vp.name,
          error: String(err.message || err),
        });
      }
      await page.close();
    }
  }

  await browser.close();
  return results;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = await measure();
  for (const r of results) {
    const file = path.join(OUT_DIR, `official-${r.route}-${r.viewport}.json`);
    fs.writeFileSync(file, JSON.stringify(r, null, 2));
    console.log(`Đã ghi ${path.basename(file)}`);
  }
})();
