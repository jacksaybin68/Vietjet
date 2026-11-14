#!/usr/bin/env node
/**
 * Kiểm tra bottom nav (thanh 88px) của site thật ở các route mobile.
 *
 * Chạy: node scripts/probe-official-bottomnav.cjs
 */
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URLS = [
  'https://newweb.vietjetair.com/vi/checkin',
  'https://newweb.vietjetair.com/vi/my/search-booking',
  'https://newweb.vietjetair.com/vi/signin',
  'https://newweb.vietjetair.com/vi/signup',
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const url of URLS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      // Tìm phần tử fixed ở đáy màn hình, cao ~88px, chứa 4 nhãn.
      const fixed = [...document.querySelectorAll('div,nav,ul')].filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          (cs.position === 'fixed' || cs.position === 'sticky') &&
          r.height > 60 &&
          r.width >= 360 &&
          r.bottom >= window.innerHeight - 2 &&
          r.top > 0
        );
      });
      return fixed.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 90),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          bg: cs.backgroundColor,
          radius: cs.borderRadius,
          shadow: cs.boxShadow,
          text: (el.innerText || '').replace(/\s+/g, ' | ').slice(0, 120),
        };
      });
    });

    console.log(`\n== ${url}`);
    console.log(JSON.stringify(data, null, 1));
    await page.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
