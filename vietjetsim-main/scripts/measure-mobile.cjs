/**
 * Đo giao diện MOBILE (390×844) của app và đối chiếu với số đo site thật đã lưu
 * trong docs/qa/VIETJET_THAM_SO_GIAO_DIEN_2026-11-13.md §4.2.
 *
 * Dùng: node scripts/measure-mobile.cjs [baseUrl]
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE = process.argv[2] || 'http://127.0.0.1:4028';
const OUT = path.join(__dirname, '..', '.screenshots-mobile');
const VIEWPORT = { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 };

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

/** Số đo site thật (390×844) — nguồn: docs/qa/VIETJET_THAM_SO_GIAO_DIEN_2026-11-13.md §4.2 */
const EXPECTED = {
  announceHeight: 35,
  utilityRowHeight: 40,
  utilityRowY: 35,
  logoHeight: 15,
  logoY: 51,
  dotsY: 332,
  dotsHeight: 26,
  bookingPanelY: 420,
  bookingPanelHeight: 305,
  fieldHeight: 48,
  fieldRadius: 10,
  bottomNavHeight: 62,
  bottomNavY: 782,
  bottomNavRadius: '15px 15px 0px 0px',
  bottomNavLabelSize: 10,
  bottomNavIcon: 24,
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.goto(`${BASE}/trang-chu`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 6000));

  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    const style = (el, props) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const out = {};
      for (const p of props) out[p] = c[p];
      return out;
    };
    const byText = (sel, text) =>
      Array.from(document.querySelectorAll(sel)).find((el) =>
        (el.textContent || '').trim().includes(text)
      );

    const announce = document.querySelector('[aria-label="Thông báo"]');
    const header = document.querySelector('header');
    const logo = document.querySelector('header img[alt="Vietjet Air"]');
    const dots = document.querySelector('[data-testid="hero-slider-dots"]');
    const panel = document.querySelector('.vj-booking-panel');
    const tabs = document.querySelector('.vj-booking-tabs');
    const bottomNav = document.querySelector('[data-testid="mobile-bottom-nav"]');
    const bottomLabel = bottomNav?.querySelector('span');
    const bottomIcon = bottomNav?.querySelector('svg');

    const field = panel
      ?.querySelector('button[aria-label="Điểm khởi hành"]')
      ?.closest('div[class*="rounded-vj"]');
    const cta = byText('button', 'Tìm chuyến bay');

    // Utility row: hàng chứa nút "Hỗ trợ" / "Đăng nhập" ở chế độ mobile.
    const utilityRow = header?.querySelector('a[href^="tel:"]')?.closest('div');

    const doc = document.documentElement;
    const offenders = [];
    if (doc.scrollWidth - doc.clientWidth > 0) {
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 && r.width > 0) {
          offenders.push({
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 60),
            right: Math.round(r.right),
            w: Math.round(r.width),
          });
        }
      });
    }

    return {
      viewport: { w: innerWidth, h: innerHeight },
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalOverflow: doc.scrollWidth - doc.clientWidth,
      offenders: offenders.slice(0, 10),
      announce: { box: rect(announce), ...style(announce, ['backgroundColor', 'fontSize']) },
      utilityRow: { box: rect(utilityRow), ...style(utilityRow, ['padding', 'height']) },
      logo: { box: rect(logo), ...style(logo, ['height', 'width']) },
      dots: { box: rect(dots) },
      panel: { box: rect(panel), ...style(panel, ['backgroundImage', 'borderRadius']) },
      tabs: { box: rect(tabs), ...style(tabs, ['height']) },
      field: { box: rect(field), ...style(field, ['height', 'borderRadius']) },
      cta: { box: rect(cta), ...style(cta, ['fontSize', 'textTransform', 'backgroundImage']) },
      bottomNav: {
        box: rect(bottomNav),
        ...style(bottomNav, ['height', 'borderRadius', 'backgroundImage', 'position']),
      },
      bottomLabel: { box: rect(bottomLabel), ...style(bottomLabel, ['fontSize', 'fontWeight']) },
      bottomIcon: { box: rect(bottomIcon) },
    };
  });

  await page.screenshot({ path: path.join(OUT, 'mobile-390.png'), fullPage: true });
  await page.screenshot({ path: path.join(OUT, 'mobile-390-viewport.png') });

  const out = { base: BASE, measured: data, expected: EXPECTED };
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(OUT, 'measure-mobile-390.json'), JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
