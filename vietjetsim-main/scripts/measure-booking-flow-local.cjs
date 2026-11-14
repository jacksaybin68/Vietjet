#!/usr/bin/env node
/**
 * measure-booking-flow-local.cjs — đo cùng bộ câu hỏi với `official-select-flight.json`
 * nhưng trên APP LOCAL, rồi in bảng đối chiếu + chỉ ra mục nào vượt ngưỡng.
 *
 *   PARITY_BASE_URL=http://127.0.0.1:4031 node scripts/measure-booking-flow-local.cjs
 *
 * Số đo site thật lấy từ docs/qa/VIETJET_DOI_CHIEU_LUU_DAT_VE_2026-11-14.md §2.
 * Script này KHÔNG truy cập internet — chạy được offline.
 *
 * Ngưỡng chấp nhận (docs/qa/VIETJET_DOI_CHIEU_LUU_DAT_VE_2026-11-14.md §8):
 *   - cỡ chữ / bo góc / màu: khớp tuyệt đối
 *   - kích thước ô, nút: ±2px
 *   - vị trí ngang (x): ±16px
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const APP_ROOT = path.resolve(__dirname, '..');
const BASE_URL = (process.env.PARITY_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const TARGET = `${BASE_URL}/tim-ve?from=HAN&to=SGN&depart=${TOMORROW}&adult=1`;

/** Probe đo trên DOM sống của app local. */
const PROBE = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 60),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      font: c.fontFamily.split(',')[0],
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage.slice(0, 160),
      radius: c.borderRadius,
      padding: c.padding,
      shadow: c.boxShadow.slice(0, 100),
    };
  };
  /** Phần tử đang thực sự hiển thị (bỏ qua bản mobile bị ẩn). */
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const c = getComputedStyle(el);
    return c.display !== 'none' && c.visibility !== 'hidden' && c.opacity !== '0';
  };
  const all = (sel) => Array.from(document.querySelectorAll(sel));
  const firstVisible = (sel) => all(sel).find(vis) || null;
  const byText = (sel, text) =>
    all(sel).find((el) => (el.textContent || '').trim().startsWith(text) && vis(el)) || null;

  const out = { viewport: { w: innerWidth, h: innerHeight } };

  // Header
  const header = firstVisible('header');
  out.header = box(header);
  out.headerRadius = header ? getComputedStyle(header).borderRadius : null;

  // Băng "CHUYẾN BAY MỘT CHIỀU | 1 Người lớn"
  out.tripStrip = box(document.querySelector('.vj-booking-strip'));
  out.tripStripTitle = box(document.querySelector('.vj-booking-strip-title'));

  // Dải ngày: ô ngày đầu tiên. Route `/tim-ve` dùng dải ngày nội bộ của
  // `FlightResultsStep` (`data-testid="departure-date-strip"`); component
  // `DateStrip.tsx` ở `app/tim-ve/components` là bản khác, không render ở đây.
  const strip = firstVisible('[data-testid="departure-date-strip"]');
  out.dateStrip = box(strip);
  out.dateCell = box(strip && strip.querySelector('button:not([aria-label])'));
  out.dateCellText = out.dateCell ? out.dateCell.text : null;

  // H1 cột trái + cột trái
  const h1 = byText('h1', 'Lựa chọn chuyến bay');
  out.h1 = box(h1);
  out.leftCol = box(h1 && h1.parentElement);

  // Panel "THÔNG TIN ĐẶT CHỖ"
  const panelH3 = byText('aside h3', 'THÔNG TIN ĐẶT CHỖ');
  const aside = panelH3 ? panelH3.closest('aside') : firstVisible('aside');
  out.panel = box(aside);
  out.panelHeader = box(panelH3 && panelH3.parentElement);
  out.panelH3 = box(panelH3);
  const firstBar = aside ? aside.querySelector('.vj-summary-bar') : null;
  out.panelBar = box(firstBar);
  out.panelBarTitle = box(firstBar && firstBar.querySelector('span'));
  const panelTotal = aside ? aside.querySelector('.vj-summary-total') : null;
  out.panelTotal = box(panelTotal);
  out.panelTotalLabel = box(panelTotal && panelTotal.children[0]);
  out.panelTotalAmount = box(panelTotal && panelTotal.children[1]);

  // Băng tổng dưới
  out.bottomBar = box(firstVisible('.vj-total-bar'));
  out.bottomInner = box(firstVisible('.vj-total-bar-inner'));
  out.bottomLabel = box(firstVisible('.vj-total-bar-label'));
  out.bottomAmount = box(firstVisible('.vj-total-bar-amount'));

  // Nút "Đi tiếp"
  const cta = all('button').find((b) => (b.textContent || '').trim() === 'Đi tiếp' && vis(b));
  out.cta = box(cta);

  // Cột phải (khung 410px, bên trong là panel 380px)
  out.rightCol = box(aside && aside.parentElement);

  out.bodyFont = getComputedStyle(document.body).fontFamily;
  out.bodySize = getComputedStyle(document.body).fontSize;
  return JSON.stringify(out);
};

/** Số đo chuẩn của site thật (docs/qa/VIETJET_DOI_CHIEU_LUU_DAT_VE_2026-11-14.md §2). */
const OFFICIAL = {
  'left column width': { site: 820, key: 'w', tol: 2 },
  'panel width': { site: 380, key: 'w', tol: 2 },
  'panel radius': { site: '6px', key: 'radius' },
  'panel x': { site: 940, key: 'x', tol: 16 },
  'panel header height': { site: 56, key: 'h', tol: 2 },
  'panel h3 font-size': { site: '20px', key: 'fs' },
  'panel h3 weight': { site: '700', key: 'fw' },
  'panel bar height': { site: 52, key: 'h', tol: 2 },
  'panel bar title font-size': { site: '18px', key: 'fs' },
  'panel bar bg': { site: 'rgb(241, 241, 241)', key: 'bg' },
  'panel total height': { site: 50, key: 'h', tol: 2 },
  'panel total label font-size': { site: '20px', key: 'fs' },
  'panel total amount font-size': { site: '22px', key: 'fs' },
  'date cell width': { site: 156, key: 'w', tol: 2 },
  'date cell height': { site: 95, key: 'h', tol: 2 },
  'date cell font-size': { site: '16px', key: 'fs' },
  'cta width': { site: 127, key: 'w', tol: 2 },
  'cta height': { site: 39, key: 'h', tol: 2 },
  'cta radius': { site: '10px', key: 'radius' },
  'cta font-size': { site: '14px', key: 'fs' },
  'bottom bar inner width': { site: 1200, key: 'w', tol: 2 },
  'bottom bar inner height': { site: 59, key: 'h', tol: 2 },
  'bottom label font-size': { site: '16px', key: 'fs' },
  'bottom amount font-size': { site: '20px', key: 'fs' },
  'bottom label x': { site: 769, key: 'x', tol: 16 },
  'header height': { site: 74, key: 'h', tol: 2 },
  'header radius': { site: '0px 0px 16px 16px', key: 'radius' },
  'trip strip width': { site: 1200, key: 'w', tol: 2 },
  'trip strip height': { site: 82, key: 'h', tol: 2 },
  'trip strip radius': { site: '16px', key: 'radius' },
  'trip strip title font-size': { site: '18px', key: 'fs' },
};

const LOCAL_KEY = {
  'left column width': 'leftCol',
  'panel width': 'panel',
  'panel radius': 'panel',
  'panel x': 'panel',
  'panel header height': 'panelHeader',
  'panel h3 font-size': 'panelH3',
  'panel h3 weight': 'panelH3',
  'panel bar height': 'panelBar',
  'panel bar title font-size': 'panelBarTitle',
  'panel bar bg': 'panelBar',
  'panel total height': 'panelTotal',
  'panel total label font-size': 'panelTotalLabel',
  'panel total amount font-size': 'panelTotalAmount',
  'date cell width': 'dateCell',
  'date cell height': 'dateCell',
  'date cell font-size': 'dateCell',
  'cta width': 'cta',
  'cta height': 'cta',
  'cta radius': 'cta',
  'cta font-size': 'cta',
  'bottom bar inner width': 'bottomInner',
  'bottom bar inner height': 'bottomInner',
  'bottom label font-size': 'bottomLabel',
  'bottom amount font-size': 'bottomAmount',
  'bottom label x': 'bottomLabel',
  'header height': 'header',
  'header radius': 'header',
  'trip strip width': 'tripStrip',
  'trip strip height': 'tripStrip',
  'trip strip radius': 'tripStrip',
  'trip strip title font-size': 'tripStripTitle',
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--no-proxy-server'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  const raw = await page.evaluate(PROBE);
  const m = JSON.parse(raw);
  await browser.close();

  if (process.argv.includes('--json')) {
    const dir = path.join(APP_ROOT, 'docs', 'qa', '2026-11-13-vietjet-measure');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'app-local-booking-flow.json'), JSON.stringify(m, null, 2));
    console.log('Đã ghi app-local-booking-flow.json');
  }

  const rows = [];
  let fails = 0;
  for (const [name, spec] of Object.entries(OFFICIAL)) {
    const el = m[LOCAL_KEY[name]];
    const got = el ? el[spec.key] : undefined;
    let status;
    if (got === undefined || got === null) {
      status = '❌ không đo được';
      fails += 1;
    } else if (typeof spec.site === 'number') {
      const d = Number(got) - spec.site;
      status = Math.abs(d) <= spec.tol ? '✅' : '❌';
      if (status === '❌') fails += 1;
    } else {
      status = String(got) === String(spec.site) ? '✅' : '❌';
      if (status === '❌') fails += 1;
    }
    rows.push({
      'hạng mục': name,
      'site thật': spec.site,
      'app local': got === undefined ? '—' : got,
      ngưỡng: spec.tol ? `±${spec.tol}px` : 'tuyệt đối',
      'kết quả': status,
    });
  }

  console.log('\n=== Đối chiếu luồng đặt vé (/tim-ve, 1440×900) ===\n');
  console.table(rows);
  console.log(`\n${rows.length - fails}/${rows.length} mục trong ngưỡng.`);

  console.log('\n--- chi tiết hình học ---');
  for (const k of [
    'header',
    'tripStrip',
    'tripStripTitle',
    'dateCell',
    'h1',
    'leftCol',
    'rightCol',
    'panel',
    'panelHeader',
    'panelBar',
    'panelTotal',
    'panelTotalLabel',
    'panelTotalAmount',
    'bottomBar',
    'bottomInner',
    'bottomLabel',
    'bottomAmount',
    'cta',
  ]) {
    if (!m[k]) continue;
    const b = m[k];
    console.log(
      `${k.padEnd(18)} x=${String(b.x).padStart(5)} y=${String(b.y).padStart(5)} ` +
        `${String(b.w).padStart(5)}×${String(b.h).padStart(5)} ` +
        `fs=${b.fs} fw=${b.fw} font=${b.font} bg=${b.bg} r=${b.radius}`
    );
  }
  if (m.panelHeader?.bgImage) console.log('panelHeader gradient:', m.panelHeader.bgImage);
  if (m.cta?.bgImage) console.log('cta gradient        :', m.cta.bgImage);
  if (m.tripStrip?.bgImage) console.log('tripStrip gradient  :', m.tripStrip.bgImage);
  if (m.dateCellText) console.log('dateCell text       :', m.dateCellText);

  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
