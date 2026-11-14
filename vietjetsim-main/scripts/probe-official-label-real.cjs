#!/usr/bin/env node
/**
 * Đo LABEL THẬT (label lồng bên trong MuiInputLabel) của ô nhập tra cứu.
 *
 * Chạy: node scripts/probe-official-label-real.cjs
 */
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URLS = [
  'https://newweb.vietjetair.com/vi/checkin',
  'https://newweb.vietjetair.com/vi/my/search-booking',
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const url of URLS) {
    for (const vp of [
      { name: 'desktop-1440', width: 1440, height: 900 },
      { name: 'mobile-390', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 500 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
      await new Promise((r) => setTimeout(r, 1500));

      const data = await page.evaluate(() => {
        const input = document.querySelector('input[name="reservationLocator"]');
        if (!input) return null;
        const fc = input.closest('[class*="MuiFormControl"]');
        const inner = fc.querySelector('label label');
        const outer = fc.querySelector('label');
        const desc = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName,
            text: el.textContent.trim(),
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            fs: cs.fontSize,
            lh: cs.lineHeight,
            fw: cs.fontWeight,
            ff: cs.fontFamily,
            color: cs.color,
            position: cs.position,
            transform: cs.transform,
            top: cs.top,
            left: cs.left,
            padding: cs.padding,
            margin: cs.margin,
          };
        };
        // span dấu *
        const star = inner?.querySelector('span');
        // gạch chân dưới của Input-underline
        const underline = fc.querySelector('[class*="MuiInput-underline"]');
        const before = underline ? getComputedStyle(underline, '::after') : null;
        const ucs = underline ? getComputedStyle(underline) : null;
        return {
          outer: desc(outer),
          inner: desc(inner),
          star: desc(star),
          underline: ucs
            ? {
                h: ucs.height,
                borderBottom: ucs.borderBottom,
                background: ucs.backgroundColor,
                position: ucs.position,
                bottom: ucs.bottom,
              }
            : null,
          underlineAfter: before
            ? {
                content: before.content,
                h: before.height,
                bg: before.backgroundColor,
                border: before.borderBottom,
              }
            : null,
        };
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
