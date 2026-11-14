#!/usr/bin/env node
/**
 * Chụp ảnh vùng form tra cứu trên site thật để soi nhãn/ô nhập.
 *
 * Chạy: node scripts/shoot-official-lookup-form.cjs
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, '..', 'docs', 'qa', '2026-11-15-vietjet-measure');

const TARGETS = [
  { url: 'https://newweb.vietjetair.com/vi/checkin', name: 'official-checkin-form' },
  { url: 'https://newweb.vietjetair.com/vi/my/search-booking', name: 'official-booking-form' },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const vp of [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'mobile-390', width: 390, height: 844 },
  ]) {
    for (const t of TARGETS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 500 });
      await page.goto(t.url, { waitUntil: 'networkidle2', timeout: 90_000 });
      await new Promise((r) => setTimeout(r, 1200));
      // ẩn banner cookie
      await page.evaluate(() => {
        document.querySelectorAll('[id*="cookie" i], [class*="cookie" i]').forEach((el) => {
          if (el.getBoundingClientRect().height > 40) el.style.display = 'none';
        });
      });
      await new Promise((r) => setTimeout(r, 400));
      const file = path.join(OUT, `${t.name}-${vp.name}.png`);
      await page.screenshot({ path: file });
      console.log(`saved ${file}`);
      await page.close();
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
