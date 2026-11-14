const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_URL = 'https://vietjet.shop/trang-chu';
const OUT_DIR = path.resolve(__dirname, '../docs/qa/screenshots');

async function verify() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  console.log(`[QA] Navigating to ${TARGET_URL}...`);

  // 1. Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3500));

  const desktopMetrics = await page.evaluate(() => {
    const toObj = (rect) => rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height), y: Math.round(rect.y) } : null;
    const hero = document.querySelector('section');
    const widget = document.querySelector('.vj-booking-rail')?.closest('.absolute');
    const serviceStrip = document.querySelectorAll('section')[1];
    const firstCard = document.querySelector('.vj-service-card');

    const widgetRect = widget ? widget.getBoundingClientRect() : null;
    const cardRect = firstCard ? firstCard.getBoundingClientRect() : null;

    return {
      hero: toObj(hero?.getBoundingClientRect()),
      widget: toObj(widgetRect),
      serviceStrip: toObj(serviceStrip?.getBoundingClientRect()),
      firstCard: toObj(cardRect),
      isOverlap: (widgetRect && cardRect) ? (widgetRect.bottom > cardRect.top) : false,
      gapBetweenWidgetAndCard: (widgetRect && cardRect) ? Math.round(cardRect.top - widgetRect.bottom) : null,
    };
  });

  console.log('[QA] Desktop Metrics:', JSON.stringify(desktopMetrics, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, 'live-home-desktop-verified.png'), fullPage: false });
  console.log('[QA] Desktop screenshot saved.');

  // 2. Mobile 390x844
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3500));

  const mobileMetrics = await page.evaluate(() => {
    const toObj = (rect) => rect ? { top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height), y: Math.round(rect.y) } : null;
    const hero = document.querySelector('section');
    const widget = document.querySelector('.vj-booking-rail')?.closest('.absolute');
    const firstCard = document.querySelector('.vj-service-card');

    const widgetRect = widget ? widget.getBoundingClientRect() : null;
    const cardRect = firstCard ? firstCard.getBoundingClientRect() : null;

    return {
      hero: toObj(hero?.getBoundingClientRect()),
      widget: toObj(widgetRect),
      firstCard: toObj(cardRect),
      isOverlap: (widgetRect && cardRect) ? (widgetRect.bottom > cardRect.top) : false,
      gapBetweenWidgetAndCard: (widgetRect && cardRect) ? Math.round(cardRect.top - widgetRect.bottom) : null,
    };
  });

  console.log('[QA] Mobile Metrics:', JSON.stringify(mobileMetrics, null, 2));
  await page.screenshot({ path: path.join(OUT_DIR, 'live-home-mobile-verified.png'), fullPage: false });
  console.log('[QA] Mobile screenshot saved.');

  await browser.close();

  if (desktopMetrics.isOverlap) {
    console.error('[QA FAIL] Desktop booking widget overlaps service cards!');
    process.exit(1);
  }
  console.log('[QA PASS] No overlap detected. All clearances confirmed.');
}

verify().catch(err => {
  console.error('[QA ERROR]', err);
  process.exit(1);
});
