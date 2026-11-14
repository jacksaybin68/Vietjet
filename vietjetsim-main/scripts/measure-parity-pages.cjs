#!/usr/bin/env node
/**
 * measure-parity-pages.cjs — đo cùng bộ câu hỏi trên app LOCAL (4028) và
 * in ra bảng đối chiếu với số đo site thật đã lưu trong docs/qa.
 *
 *   node scripts/measure-parity-pages.cjs            # bảng so sánh
 *   node scripts/measure-parity-pages.cjs --json     # ghi JSON ra docs/qa
 *
 * Số đo site thật nằm ở docs/qa/2026-11-13-vietjet-measure/*.json (sinh ra
 * bằng scripts/measure-official.cjs). Script này KHÔNG truy cập internet —
 * nó chỉ mở app local, nên chạy được trong môi trường không mạng.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const APP_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.PARITY_BASE_URL || 'http://127.0.0.1:4028';
const OUT_DIR = path.join(APP_ROOT, 'docs', 'qa', '2026-11-13-vietjet-measure');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = [
  { slug: 'home', local: '/trang-chu', official: '/vi/' },
  { slug: 'my-search-booking', local: '/chuyen-bay-cua-toi', official: '/vi/my/search-booking' },
  { slug: 'checkin', local: '/lam-thu-tuc', official: '/vi/checkin' },
  {
    slug: 'booking-search',
    local: '/tim-ve?from=HAN&to=SGN&depart=2026-11-20&adult=1',
    official: '/vi/pages/booking-search',
  },
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
];

/** Câu hỏi đo: mỗi câu trả về một số đơn vị px hoặc chuỗi style. */
const PROBE = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      color: c.color,
      bg: c.backgroundColor,
      radius: c.borderRadius,
      shadow: c.boxShadow,
    };
  };
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (e) => e && e.offsetParent !== null;

  const header = document.querySelector('header');
  const h1 = q('h1').find(vis) || null;
  const h2 = q('h2').find(vis) || null;
  const inputs = q('input')
    .filter(vis)
    .slice(0, 3)
    .map((i) => box(i.parentElement));
  const submit = q('button')
    .filter(vis)
    .find((b) => /tìm kiếm/i.test(b.textContent || ''));

  return {
    header: box(header),
    headerBg: header ? getComputedStyle(header).backgroundColor : null,
    headerRadius: header ? getComputedStyle(header).borderRadius : null,
    h1: box(h1),
    h2: box(h2),
    inputs,
    submit: box(submit),
  };
};

async function measure() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      try {
        await page.goto(BASE_URL + route.local, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await new Promise((r) => setTimeout(r, 1200));
        const data = await page.evaluate(PROBE);
        results.push({ route: route.slug, local: route.local, viewport: vp.name, ...data });
      } catch (err) {
        results.push({
          route: route.slug,
          local: route.local,
          viewport: vp.name,
          error: String(err.message || err),
        });
      }
      await page.close();
    }
  }

  await browser.close();
  return results;
}

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    if (v.error) return v.error;
    return `${v.w}×${v.h}`;
  }
  return String(v);
}

(async () => {
  const results = await measure();

  if (process.argv.includes('--json')) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, 'app-local.json');
    fs.writeFileSync(file, JSON.stringify(results, null, 2));
    console.log(`Đã ghi ${file}`);
  }

  const official = {};
  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR)) {
      if (!f.startsWith('official-') || !f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
        official[`${j.route}::${j.viewport}`] = j;
      } catch {
        /* bỏ qua file hỏng */
      }
    }
  }

  console.log('\n=== Đối chiếu site thật | app local ===\n');
  const rows = [];
  for (const r of results) {
    const off = official[`${r.route}::${r.viewport}`] || null;
    rows.push({
      route: r.route,
      viewport: r.viewport,
      'site header': off ? fmt(off.header) : '—',
      'app header': fmt(r.header),
      'site input': off ? fmt(off.inputs && off.inputs[0]) : '—',
      'app input': fmt(r.inputs && r.inputs[0]),
      'site btn': off ? fmt(off.submit) : '—',
      'app btn': fmt(r.submit),
    });
  }
  console.table(rows);
})();
