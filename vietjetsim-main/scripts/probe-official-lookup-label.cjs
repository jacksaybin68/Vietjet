#!/usr/bin/env node
/**
 * Đo nhãn (label) + wrapper của ô nhập tra cứu trên site thật,
 * ở desktop 1440×900 và mobile 390×844.
 *
 * Chạy: node scripts/probe-official-lookup-label.cjs
 */
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URLS = [
  'https://newweb.vietjetair.com/vi/checkin',
  'https://newweb.vietjetair.com/vi/my/search-booking',
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const url of URLS) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 500 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
      await new Promise((r) => setTimeout(r, 1500));

      const data = await page.evaluate(() => {
        const out = [];
        const inputs = [...document.querySelectorAll('input')].filter(
          (i) => i.getAttribute('type') === 'text' && i.getBoundingClientRect().width > 100
        );
        for (const input of inputs.slice(0, 3)) {
          const wrap = input.closest('[class*="MuiFormControl"]') || input.parentElement;
          const label =
            wrap && wrap.querySelector('label')
              ? wrap.querySelector('label')
              : input.parentElement?.querySelector('label');
          const r = input.getBoundingClientRect();
          const wr = wrap.getBoundingClientRect();
          const cs = getComputedStyle(input);
          const wcs = getComputedStyle(wrap);
          const entry = {
            inputName: input.getAttribute('name'),
            input: {
              x: Math.round(r.x),
              y: Math.round(r.y),
              w: Math.round(r.width),
              h: Math.round(r.height),
              fs: cs.fontSize,
              lh: cs.lineHeight,
              fw: cs.fontWeight,
              ff: cs.fontFamily,
              padding: cs.padding,
            },
            wrapper: {
              x: Math.round(wr.x),
              y: Math.round(wr.y),
              w: Math.round(wr.width),
              h: Math.round(wr.height),
              fs: wcs.fontSize,
              fw: wcs.fontWeight,
              margin: wcs.margin,
              padding: wcs.padding,
            },
          };
          if (label) {
            const lr = label.getBoundingClientRect();
            const lcs = getComputedStyle(label);
            entry.label = {
              text: label.textContent.trim(),
              x: Math.round(lr.x),
              y: Math.round(lr.y),
              w: Math.round(lr.width),
              h: Math.round(lr.height),
              fs: lcs.fontSize,
              lh: lcs.lineHeight,
              fw: lcs.fontWeight,
              ff: lcs.fontFamily,
              color: lcs.color,
              transform: lcs.transform,
            };
          }
          out.push(entry);
        }
        return out;
      });

      console.log(`\n== ${url} @ ${vp.name}`);
      console.log(JSON.stringify(data, null, 1));
      await page.close();
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
