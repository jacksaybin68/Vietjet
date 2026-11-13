const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = path.join(__dirname, '../.screenshots-qa');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const results = {};

  // 1. Kiểm tra Trang Chủ (Desktop 1440)
  console.log('--- 1. Kiểm tra Trang Chủ (1440x900) ---');
  await page.goto('http://127.0.0.1:4028/trang-chu', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-desktop.png'), fullPage: false });

  const homeData = await page.evaluate(() => {
    const getBox = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        text: el.innerText ? el.innerText.trim().slice(0, 40) : '',
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
      };
    };

    // Header tiers
    const header = document.querySelector('header');
    const headerBox = getBox(header);

    // Nav links
    const navItems = Array.from(
      document.querySelectorAll('header nav a, header nav button, header a')
    )
      .map(getBox)
      .filter(Boolean);

    // Hero Panel
    const heroPanel =
      document.querySelector('.vj-hero-panel, section .vj-booking-widget') ||
      document.querySelector('section form')?.parentElement;
    const heroBox = getBox(heroPanel);

    // Booking Tabs
    const tabs = Array.from(document.querySelectorAll('[role="tab"], .vj-booking-tab')).map(getBox);

    // Search CTA
    const ctaBtn = document.querySelector('button.vj-cta, button[type="submit"]');
    const ctaBox = getBox(ctaBtn);

    // Check for any text overflow
    const allTextEls = Array.from(
      document.querySelectorAll('h1, h2, h3, p, span, button, a, label')
    );
    const overflows = [];
    for (const el of allTextEls) {
      if (
        el.scrollWidth > el.clientWidth + 2 &&
        el.clientWidth > 0 &&
        !el.classList.contains('truncate')
      ) {
        const style = window.getComputedStyle(el);
        if (style.overflow !== 'hidden' && style.overflowX !== 'auto') {
          overflows.push({
            tag: el.tagName,
            text: el.innerText?.slice(0, 30),
            clientW: el.clientWidth,
            scrollW: el.scrollWidth,
            cls: el.className,
          });
        }
      }
    }

    return {
      headerBox,
      heroBox,
      tabs: tabs.slice(0, 5),
      ctaBox,
      overflowCount: overflows.length,
      sampleOverflows: overflows.slice(0, 5),
    };
  });

  results.home = homeData;

  // 2. Kiểm tra Trang Làm Thủ Tục (/lam-thu-tuc)
  console.log('--- 2. Kiểm tra Trang Làm Thủ Tục ---');
  await page.goto('http://127.0.0.1:4028/lam-thu-tuc', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'checkin-desktop.png'),
    fullPage: false,
  });

  const checkinData = await page.evaluate(() => {
    const getBox = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        text: el.innerText ? el.innerText.trim().slice(0, 40) : '',
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      };
    };

    const card =
      document.querySelector('.vj-lookup-card') ||
      document.querySelector('main form')?.parentElement;
    const inputs = Array.from(document.querySelectorAll('input')).map(getBox);
    const searchBtn = document.querySelector('button.vj-lookup-btn, button[type="submit"]');

    return {
      card: getBox(card),
      inputs,
      searchBtn: getBox(searchBtn),
    };
  });
  results.checkin = checkinData;

  // 3. Kiểm tra Trang Chuyến Bay Của Tôi (/chuyen-bay-cua-toi)
  console.log('--- 3. Kiểm tra Trang Chuyến Bay Của Tôi ---');
  await page.goto('http://127.0.0.1:4028/chuyen-bay-cua-toi', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'my-flights-desktop.png'),
    fullPage: false,
  });

  const myFlightsData = await page.evaluate(() => {
    const getBox = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: el.innerText ? el.innerText.trim().slice(0, 40) : '',
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };

    const subtabs = Array.from(
      document.querySelectorAll('.vj-subtabs button, .vj-subtabs-item')
    ).map(getBox);
    const inputs = Array.from(document.querySelectorAll('input')).map(getBox);
    const btn = document.querySelector('button.vj-lookup-btn, button[type="submit"]');

    return {
      subtabs,
      inputs,
      btn: getBox(btn),
    };
  });
  results.myFlights = myFlightsData;

  // 4. Kiểm tra Mobile Viewport (390x844) trên Trang Chủ
  console.log('--- 4. Kiểm tra Mobile Viewport (390x844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4028/trang-chu', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'home-mobile.png'), fullPage: false });

  const mobileData = await page.evaluate(() => {
    const bottomNav =
      document.querySelector('nav.fixed.bottom-0') ||
      document.querySelector('.vj-mobile-bottom-nav');
    const bottomNavBox = bottomNav
      ? {
          w: Math.round(bottomNav.getBoundingClientRect().width),
          h: Math.round(bottomNav.getBoundingClientRect().height),
          y: Math.round(bottomNav.getBoundingClientRect().y),
        }
      : null;

    const ctaBtn = document.querySelector('button.vj-cta, button[type="submit"]');
    const ctaBox = ctaBtn
      ? {
          w: Math.round(ctaBtn.getBoundingClientRect().width),
          h: Math.round(ctaBtn.getBoundingClientRect().height),
          text: ctaBtn.innerText?.trim(),
        }
      : null;

    return {
      bottomNavBox,
      ctaBox,
    };
  });
  results.mobile = mobileData;

  console.log('=== KẾT QUẢ ĐO ĐẠC VÀ KIỂM TRA VỊ TRÍ VĂN BẢN ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

run().catch((err) => {
  console.error('Error running QA check:', err);
  process.exit(1);
});
