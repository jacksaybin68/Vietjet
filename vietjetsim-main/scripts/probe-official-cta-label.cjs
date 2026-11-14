#!/usr/bin/env node
/** Đo chính xác label span + svg trong nút CTA của site thật. */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
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
    const label = cta.querySelector('span span');
    const svg = cta.querySelector('svg');
    const cr = cta.getBoundingClientRect();
    const lr = label ? label.getBoundingClientRect() : null;
    const sr = svg ? svg.getBoundingClientRect() : null;
    const ls = label ? getComputedStyle(label) : null;
    const ss = svg ? getComputedStyle(svg) : null;
    return {
      cta: { x: cr.x, right: cr.right, w: cr.width },
      label: lr ? { x: lr.x, right: lr.right, w: lr.width } : null,
      labelStyle: ls
        ? { ff: ls.fontFamily, fs: ls.fontSize, display: ls.display, gap: ls.gap }
        : null,
      svg: sr ? { x: sr.x, right: sr.right, w: sr.width } : null,
      svgStyle: ss
        ? {
            marginLeft: ss.marginLeft,
            marginRight: ss.marginRight,
            verticalAlign: ss.verticalAlign,
          }
        : null,
    };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
