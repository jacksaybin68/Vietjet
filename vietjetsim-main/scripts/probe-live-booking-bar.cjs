#!/usr/bin/env node
/** Đo dải đặt vé trực tiếp trên bản deploy production (vietjet.shop). */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = (process.env.PROBE_BASE_URL || 'https://vietjet.shop/trang-chu').replace(/\/$/, '');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: s.borderRadius,
        borderLeft: s.borderLeft,
        borderTop: s.borderTop,
        bg: s.backgroundColor,
      };
    };
    const cta = document.querySelector('.vj-cta--hero');
    const cs = cta ? getComputedStyle(cta) : null;
    const svg = cta ? cta.querySelector('svg') : null;
    const sr = svg ? svg.getBoundingClientRect() : null;
    return {
      shell: info(document.querySelector('.vj-booking-shell')),
      rail: info(document.querySelector('.vj-booking-rail')),
      bar: info(document.querySelector('.vj-booking-bar')),
      tabs: Array.from(document.querySelectorAll('.vj-booking-rail__tab')).map((t) =>
        (t.innerText || '').trim()
      ),
      cta: cta
        ? {
            ...info(cta),
            text: (cta.innerText || '').trim(),
            ff: cs.fontFamily.split(',')[0],
            fs: cs.fontSize,
            tt: cs.textTransform,
            bgImage: cs.backgroundImage.slice(0, 70),
          }
        : null,
      ctaSvg: sr ? { w: Math.round(sr.width), h: Math.round(sr.height) } : null,
      field: info(document.querySelector('[aria-label="Điểm khởi hành"]')),
      mainCount: document.querySelectorAll('main#main-content').length,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
