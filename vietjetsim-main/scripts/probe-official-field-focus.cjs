#!/usr/bin/env node
/**
 * Đo trạng thái FOCUS của ô nhập tra cứu trên site thật + màu gạch chân nền.
 *
 * Chạy: node scripts/probe-official-field-focus.cjs
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

      const data = await page.evaluate(async () => {
        const input = document.querySelector('input[name="reservationLocator"]');
        const fc = input.closest('[class*="MuiFormControl"]');
        const inner = fc.querySelector('label label');
        const underline = fc.querySelector('[class*="MuiInput-underline"]');
        const before = getComputedStyle(underline, '::before');
        const after = getComputedStyle(underline, '::after');
        const desc = (el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            fs: cs.fontSize,
            lh: cs.lineHeight,
            fw: cs.fontWeight,
            color: cs.color,
          };
        };
        const fieldRect = fc.getBoundingClientRect();
        const idle = {
          field: {
            x: Math.round(fieldRect.x),
            y: Math.round(fieldRect.y),
            w: Math.round(fieldRect.width),
            h: Math.round(fieldRect.height),
          },
          input: desc(input),
          label: desc(inner),
          underlineBefore: {
            h: before.height,
            border: before.borderBottom,
            bg: before.backgroundColor,
          },
          underlineAfter: {
            h: after.height,
            border: after.borderBottom,
            bg: after.backgroundColor,
          },
        };
        // focus
        input.focus();
        await new Promise((r) => setTimeout(r, 600));
        const focused = {
          label: desc(inner),
          labelOuterTransform: getComputedStyle(fc.querySelector('label')).transform,
          underlineAfter: (() => {
            const a = getComputedStyle(underline, '::after');
            return { h: a.height, border: a.borderBottom, bg: a.backgroundColor };
          })(),
        };
        // có giá trị (bỏ focus)
        input.value = 'ABC123';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.blur();
        await new Promise((r) => setTimeout(r, 600));
        const filled = { label: desc(inner) };
        return { idle, focused, filled };
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
