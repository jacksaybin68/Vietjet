#!/usr/bin/env node
/** Kiểm tra màu tab ACTIVE của thanh điều hướng dưới trên site thật (mobile). */
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://www.vietjetair.com/vi/lam-thu-tuc/';

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
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 6000));
  const out = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('nav,div')).filter((n) => {
      const r = n.getBoundingClientRect();
      return Math.round(r.height) === 62 && Math.round(r.bottom) === Math.round(window.innerHeight);
    });
    const nav = navs[navs.length - 1];
    if (!nav) return { found: false };
    const items = Array.from(nav.querySelectorAll('a,li,button')).map((el) => {
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      const span = el.querySelector('span,div,p');
      const sc = span ? getComputedStyle(span) : null;
      return {
        txt: (el.textContent || '').trim().slice(0, 26),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        color: c.color,
        labelColor: sc ? sc.color : null,
        labelFs: sc ? sc.fontSize : null,
        bg: c.backgroundImage.slice(0, 60),
      };
    });
    return { found: true, items };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
