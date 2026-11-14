#!/usr/bin/env node
/** Probe chi tiết nút CTA chính (hero) trên site thật — kể cả icon svg. */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('https://newweb.vietjetair.com/vi/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(() => {
    const cta = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.textContent || '').includes('Tìm chuyến bay') && b.getBoundingClientRect().width > 0
    );
    if (!cta) return null;
    const r = cta.getBoundingClientRect();
    const svg = cta.querySelector('svg');
    const sr = svg ? svg.getBoundingClientRect() : null;
    const s = getComputedStyle(cta);
    return {
      cta: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      },
      padding: s.padding,
      gap: s.gap,
      display: s.display,
      justify: s.justifyContent,
      svg: sr
        ? {
            x: Math.round(sr.x),
            y: Math.round(sr.y),
            w: Math.round(sr.width),
            h: Math.round(sr.height),
          }
        : null,
      svgHtml: svg ? svg.outerHTML.slice(0, 400) : null,
      labelHtml: cta.querySelector('span span')
        ? cta.querySelector('span span').outerHTML.slice(0, 300)
        : null,
    };
  });

  console.log(JSON.stringify(data, null, 2));

  // Chụp riêng nút CTA để soi bằng mắt.
  const box = await page.evaluate(() => {
    const cta = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.textContent || '').includes('Tìm chuyến bay') && b.getBoundingClientRect().width > 0
    );
    if (!cta) return null;
    const r = cta.getBoundingClientRect();
    return { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: r.height + 20 };
  });
  if (box) {
    await page.screenshot({ path: '/tmp/official-cta.png', clip: box });
    console.log('đã chụp /tmp/official-cta.png');
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
