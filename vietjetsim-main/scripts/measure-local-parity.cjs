#!/usr/bin/env node
/**
 * Đo kích thước thật của app đang chạy để đối chiếu với số đo site thật.
 *
 * Chạy:  node scripts/measure-local-parity.cjs
 * Server: LOCAL_BASE_URL (mặc định http://127.0.0.1:4041)
 *
 * Ghi: docs/qa/2026-11-15-vietjet-measure/local-*.json
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE = (process.env.LOCAL_BASE_URL || 'http://127.0.0.1:4041').replace(/\/$/, '');
const OUT_DIR = path.join(__dirname, '..', 'docs', 'qa', '2026-11-15-vietjet-measure');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const PAGES = [
  { name: 'signin', url: '/dang-nhap' },
  { name: 'signup', url: '/dang-ky' },
  { name: 'forgot-password', url: '/quen-mat-khau' },
  { name: 'my-search-booking', url: '/chuyen-bay-cua-toi' },
  { name: 'checkin', url: '/lam-thu-tuc' },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = {};
  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const tab = await browser.newPage();
      await tab.setViewport({ width: vp.width, height: vp.height });
      await tab.goto(`${BASE}${page.url}`, { waitUntil: 'networkidle2', timeout: 60_000 });
      await new Promise((r) => setTimeout(r, 600));

      const data = await tab.evaluate(() => {
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            lineHeight: cs.lineHeight,
            color: cs.color,
            background: cs.backgroundColor,
            borderRadius: cs.borderRadius,
            borderBottom: cs.borderBottom,
          };
        };
        const q = (sel) => {
          // Chọn phần tử ĐANG HIỂN THỊ — trang có cả bản mobile (ẩn) và
          // desktop, `querySelector` sẽ ra phần tử ẩn (0×0).
          const nodes = [...document.querySelectorAll(sel)];
          const visible = nodes.find((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
          return box(visible);
        };
        return {
          popupFrame: q('.vj-popup-frame'),
          popupHeader: q('.vj-popup-header'),
          popupViewport: q('.vj-popup-viewport'),
          popupNav: q('.vj-popup-nav'),
          popupNavLabels: [...document.querySelectorAll('.vj-popup-nav-label')].map((el) => ({
            text: el.textContent,
            ...box(el),
          })),
          subheader: q('.vj-subheader'),
          subheaderNav: q('.vj-subheader-nav'),
          lookupField: q('.vj-lookup-field'),
          lookupInput: q('.vj-lookup-input'),
          lookupLabel: q('.vj-lookup-label'),
          lookupBtn: q('.vj-lookup-btn'),
          skyjoyLoginBtn: q('.vj-skyjoy-login-btn'),
          registerLink: q('.vj-skyjoy-register-link'),
          pillTabs: q('.vj-pill-tabs'),
          pillTab: q('.vj-pill-tab'),
          bottomNav: q('[data-testid="mobile-bottom-nav"]'),
        };
      });

      results[`${page.name}-${vp.name}`] = data;
      await tab.close();
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(OUT_DIR, 'local-parity.json'),
    `${JSON.stringify(results, null, 2)}\n`
  );
  console.info(`Đã ghi ${path.join(OUT_DIR, 'local-parity.json')}`);
  for (const [key, value] of Object.entries(results)) {
    console.info(`\n== ${key}`);
    console.info(JSON.stringify(value, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
