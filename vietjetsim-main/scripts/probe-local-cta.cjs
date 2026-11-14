#!/usr/bin/env node
/** Đo nút CTA hero của app LOCAL để đối chiếu site thật. */
const puppeteer = require('puppeteer-core');

const BASE = (process.env.MEASURE_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 5000));

  const data = await page.evaluate(() => {
    const cta = document.querySelector('.vj-cta--hero');
    if (!cta) return null;
    const r = cta.getBoundingClientRect();
    const s = getComputedStyle(cta);
    const svg = cta.querySelector('svg');
    const sr = svg ? svg.getBoundingClientRect() : null;
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: s.fontSize,
      fw: s.fontWeight,
      ff: s.fontFamily,
      tt: s.textTransform,
      padding: s.padding,
      radius: s.borderRadius,
      bgImage: s.backgroundImage,
      text: (cta.innerText || '').trim(),
      svg: sr ? { x: Math.round(sr.x), y: Math.round(sr.y), w: Math.round(sr.width), h: Math.round(sr.height) } : null,
      html: cta.innerHTML.slice(0, 300),
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
