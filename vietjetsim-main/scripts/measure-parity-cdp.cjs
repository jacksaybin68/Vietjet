#!/usr/bin/env node
/**
 * measure-parity-cdp.cjs — chạy PROBE của `measure-booking-flow-local.cjs` bằng
 * CDP thuần (Node có sẵn `WebSocket`), vì `puppeteer-core` không khởi động được
 * Chrome trong môi trường sandbox này.
 *
 *   PARITY_BASE_URL=http://127.0.0.1:4028 node scripts/measure-parity-cdp.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const APP_ROOT = path.resolve(__dirname, '..');
const BASE_URL = (process.env.PARITY_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.PARITY_CDP_PORT || 9401);
const PROFILE_DIR = path.join(require('node:os').tmpdir(), 'vj-parity-cdp', 'chrome-profile');
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const TARGET = `${BASE_URL}/tim-ve?from=HAN&to=SGN&depart=${TOMORROW}&adult=1`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function connect() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const info = await res.json();
      if (info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl;
    } catch {
      /* chưa lên */
    }
    await sleep(250);
  }
  throw new Error('Chrome không mở cổng debug');
}

/** PROBE — sao y hệt `measure-booking-flow-local.cjs`. */
const PROBE = `(() => {
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
  const header = firstVisible('header');
  out.header = box(header);
  out.headerRadius = header ? getComputedStyle(header).borderRadius : null;
  out.tripStrip = box(document.querySelector('.vj-booking-strip'));
  out.tripStripTitle = box(document.querySelector('.vj-booking-strip-title'));

  const strip = firstVisible('[data-testid="departure-date-strip"]');
  out.dateStrip = box(strip);
  out.dateCell = box(strip && strip.querySelector('button:not([aria-label])'));
  out.dateCellText = out.dateCell ? out.dateCell.text : null;
  const dateSpan =
    strip &&
    [...strip.querySelectorAll('span')].find((s) =>
      /^\\d{1,2}\\s+tháng\\s+\\d{1,2}$/.test((s.textContent || '').trim())
    );
  out.dateCellFont = box(dateSpan);
  const weekdaySpan =
    strip &&
    [...strip.querySelectorAll('span')].find(
      (s) => s.children.length === 0 && /thứ|chủ nhật/i.test((s.textContent || '').trim())
    );
  out.dateCellWeekday = box(weekdaySpan);

  const h1 = byText('h1', 'Lựa chọn chuyến bay');
  out.h1 = box(h1);
  out.leftCol = box(h1 && h1.parentElement);

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

  out.bottomBar = box(firstVisible('.vj-total-bar'));
  out.bottomInner = box(firstVisible('.vj-total-bar-inner'));
  out.bottomLabel = box(firstVisible('.vj-total-bar-label'));
  out.bottomAmount = box(firstVisible('.vj-total-bar-amount'));

  const cta = all('button').find((b) => (b.textContent || '').trim() === 'Đi tiếp' && vis(b));
  out.cta = box(cta);
  out.rightCol = box(aside && aside.parentElement);
  out.bodyFont = getComputedStyle(document.body).fontFamily;
  out.bodySize = getComputedStyle(document.body).fontSize;
  return JSON.stringify(out);
})()`;

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
  'date weekday font-size': { site: '13px', key: 'fs' },
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
  'date cell font-size': 'dateCellFont',
  'date weekday font-size': 'dateCellWeekday',
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
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${PROFILE_DIR}`,
    'about:blank',
  ]);
  chrome.stderr.on('data', () => {});

  const browserWs = new WebSocket(await connect());
  await new Promise((resolve) => browserWs.addEventListener('open', resolve, { once: true }));

  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  const cdp = new Cdp(ws);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url: TARGET });
  await sleep(6000);

  const evaluated = await cdp.send('Runtime.evaluate', {
    expression: PROBE,
    returnByValue: true,
    awaitPromise: true,
  });
  const m = JSON.parse(evaluated.result.value);
  ws.close();
  browserWs.close();
  chrome.kill();

  if (process.argv.includes('--json')) {
    const dir = path.join(APP_ROOT, 'docs', 'qa', '2026-11-13-vietjet-measure');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'app-local-booking-flow-cdp.json'), JSON.stringify(m, null, 2));
    console.log('Đã ghi app-local-booking-flow-cdp.json');
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
