/**
 * Kiểm tra tràn ngang + chụp full-page hero ở 3 viewport.
 * Dùng cho vòng polish giao diện Hero trang chủ.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE = process.argv[2] || 'http://localhost:4031';
const OUT = path.join(__dirname, '..', '.screenshots-hero');

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, isMobile: false },
  { label: 'tablet', width: 768, height: 1024, isMobile: true },
  { label: 'mobile', width: 390, height: 844, isMobile: true },
];

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
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport(vp);
    await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1000));

    const info = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      const wide = [];
      if (overflow > 0) {
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 && r.width > 0) {
            wide.push({
              tag: el.tagName,
              cls: (el.className || '').toString().slice(0, 70),
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
          }
        });
      }
      const tabs = document.querySelector('.vj-booking-tabs');
      return {
        viewport: { w: innerWidth, h: innerHeight },
        docScrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        horizontalOverflow: overflow,
        offenders: wide.slice(0, 12),
        tabs: tabs
          ? {
              scrollWidth: tabs.scrollWidth,
              clientWidth: tabs.clientWidth,
              overflows: tabs.scrollWidth > tabs.clientWidth + 1,
            }
          : null,
      };
    });

    await page.screenshot({
      path: path.join(OUT, `full-${vp.label}.png`),
      fullPage: true,
    });
    console.log(`\n=== ${vp.label} ===`);
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
