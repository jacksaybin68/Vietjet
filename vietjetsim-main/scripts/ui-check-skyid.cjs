/**
 * Kiểm tra CỐ ĐỊNH 4 route auth SkyID — bản rút gọn của `scripts/ui-check.cjs`.
 *
 * `ui-check.cjs` chụp 35 màn × 3 viewport, nên một lượt chạy mất hàng chục
 * phút. Khi thay đổi riêng bộ SkyID thì cần biết **bốn** route xác thực còn
 * đúng không — đúng một `<main>`, đúng một `#main-content`, không tràn ngang,
 * không box trùng khung, không lỗi console — mà không phải chờ toàn bộ.
 *
 * Script này dùng lại đúng cách attach CDP của `ui-check.cjs`, nhưng chỉ mở
 * Chrome một lần và ghé đúng bốn route.
 *
 *   UI_CHECK_BASE_URL=http://127.0.0.1:4029 node scripts/ui-check-skyid.cjs
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.UI_CHECK_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.UI_CHECK_CDP_PORT || 9433);
const PROFILE_DIR =
  process.env.CHROME_PROFILE_DIR ||
  path.join(os.tmpdir(), 'vietjet-ui-check-skyid', 'chrome-profile');

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'mobile', width: 390, height: 844 },
];

/** Bốn route xác thực dùng bộ SkyID 1 cột. */
const ROUTES = [
  { name: 'dang-nhap', path: '/dang-nhap' },
  { name: 'dang-ky', path: '/dang-ky' },
  { name: 'quen-mat-khau', path: '/quen-mat-khau' },
  { name: 'dat-lai-mat-khau', path: '/dat-lai-mat-khau' },
];

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      for (const fn of this.listeners) fn(msg);
    });
  }

  send(method, params = {}, timeout = 60000) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, timeout);
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

async function evaluate(cdp, expression, timeout = 30000) {
  const res = await cdp.send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    timeout
  );
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || 'evaluate lỗi');
  return res.result.value;
}

/**
 * Probe: đúng những điều kiện mà `ui-check.cjs` cờ đỏ — nhưng chỉ trên bốn
 * route auth. `mainAfterHeader` trả `null` khi trang không có `<header>`
 * (đúng: bốn route auth cố ý đứng một mình, không có header).
 */
const PROBE = `(() => {
  const de = document.documentElement;
  const nodes = [...document.querySelectorAll('header, footer, main, section, img, nav, [role="dialog"]')];
  const seen = new Map();
  const overlapped = [];
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const key = Math.round(r.left) + ':' + Math.round(r.top);
    const prev = seen.get(key);
    if (prev && !prev.contains(el) && !el.contains(prev)) {
      overlapped.push(prev.tagName + '+' + el.tagName + ' @' + key);
    } else if (!prev) {
      seen.set(key, el);
    }
  }
  const images = [...document.images];
  const main = document.querySelector('#main-content');
  const header = document.querySelector('header');
  return {
    url: location.pathname + location.search,
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 2),
    header: !!header,
    footer: !!document.querySelector('footer'),
    overflowX: de.scrollWidth - de.clientWidth,
    mainCount: document.querySelectorAll('main').length,
    mainContentCount: document.querySelectorAll('#main-content').length,
    nestedMain: [...document.querySelectorAll('main')].filter((m) => m.parentElement.closest('main')).length,
    mainAfterHeader: (() => {
      if (!main || !header) return null;
      return !!(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING);
    })(),
    skyidLayout: !!document.querySelector('.vj-skyid-layout'),
    skyidCard: !!document.querySelector('.vj-skyid-card'),
    skyidBtn: !!document.querySelector('.vj-skyid-btn'),
    emptySrcImages: images.filter((i) => !(i.getAttribute('src') || '').trim()).length,
    overlappedBoxes: overlapped.slice(0, 5),
    bodyText: document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim().length : -1,
  };
})()`;

async function attach() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const cdp = new Cdp(ws);
  const state = { consoleErrors: [], pageErrors: [], httpErrors: [] };

  cdp.listeners.push((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      state.pageErrors.push(d?.exception?.description || d?.text || 'exception');
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      state.consoleErrors.push(
        (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')
      );
    } else if (msg.method === 'Network.responseReceived') {
      const { status, url } = msg.params.response;
      if (status >= 400 && !url.includes('/api/')) state.httpErrors.push(`${status} ${url}`);
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  return { cdp, state };
}

/** Bọc một bước CDP bằng trần thời gian để một lệnh treo không giết cả lượt chạy. */
async function step(label, fn, ms = 20000) {
  let timer;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} quá ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function goto(cdp, url, { width, height }) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1200);
  // Chờ trang ổn định: hai lần đo liên tiếp giống nhau và không còn skeleton.
  //
  // `evaluate` CÓ THỂ ném khi execution context bị hủy giữa chừng (đang chuyển
  // trang) — bỏ qua lượt đó thay vì giết cả lượt chạy. Vòng lặp có trần số
  // lần nên một trang không bao giờ ổn định cũng không treo script.
  let last = '';
  for (let i = 0; i < 40; i += 1) {
    let snap;
    try {
      snap = await evaluate(
        cdp,
        `JSON.stringify({ t: document.body ? document.body.innerText.length : -1, n: document.querySelectorAll('*').length, sk: document.querySelectorAll('.skeleton-pulse,.skeleton-base,.skeleton-card,.skeleton-accent,.skeleton-row,.skeleton-shimmer').length })`,
        15000
      );
    } catch {
      await sleep(250);
      continue;
    }
    if (snap === last) break;
    last = snap;
    await sleep(300);
  }
}

async function main() {
  rmSyncSafe(PROFILE_DIR);
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
  await new Promise((r) => browserWs.addEventListener('open', r, { once: true }));

  const rows = [];
  let failed = 0;

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      console.log(`  → ${route.name}-${viewport.label}`);
      const { cdp, state } = await attach();
      try {
        await step('goto', () => goto(cdp, `${BASE}${route.path}`, viewport), 45000);
        const probe = await step('probe', () => evaluate(cdp, PROBE, 20000), 25000);
        const flags = [];
        if (probe.mainCount !== 1) flags.push(`SỐ <main> = ${probe.mainCount} (phải đúng 1)`);
        if (probe.nestedMain) flags.push(`<main> LỒNG NHAU x${probe.nestedMain}`);
        if (probe.mainContentCount !== 1)
          flags.push(`#main-content x${probe.mainContentCount} (phải đúng 1)`);
        if (probe.mainAfterHeader === false) flags.push('#main-content KHÔNG nằm sau <header>');
        if (probe.overflowX > 0) flags.push(`tràn ngang ${probe.overflowX}px`);
        if (probe.overlappedBoxes.length)
          flags.push(`trùng khung ${probe.overlappedBoxes.join(', ')}`);
        if (probe.emptySrcImages) flags.push(`<img> src rỗng x${probe.emptySrcImages}`);
        if (state.consoleErrors.length) flags.push(`console.error x${state.consoleErrors.length}`);
        if (state.pageErrors.length) flags.push(`JS exception x${state.pageErrors.length}`);
        if (state.httpErrors.length) flags.push(`HTTP lỗi x${state.httpErrors.length}`);
        if (!probe.skyidLayout) flags.push('thiếu .vj-skyid-layout');
        if (!probe.skyidCard) flags.push('thiếu .vj-skyid-card');
        if (!probe.skyidBtn) flags.push('thiếu .vj-skyid-btn');
        if (probe.bodyText < 40) flags.push(`nội dung quá ít (${probe.bodyText} ký tự)`);
        if (flags.length) failed += 1;
        rows.push({ route: route.name, viewport: viewport.label, probe, flags });
      } catch (e) {
        failed += 1;
        rows.push({
          route: route.name,
          viewport: viewport.label,
          error: String(e),
          flags: [String(e)],
        });
      }
    }
  }

  console.log('\n=== SkyID route check ===');
  for (const row of rows) {
    const mark = row.flags.length ? '❌' : '✅';
    const detail = row.flags.length ? row.flags.join(' · ') : 'OK';
    console.log(`${mark} ${row.route}-${row.viewport}: ${detail}`);
  }
  console.log(`\n${rows.length - failed}/${rows.length} màn sạch.`);
  chrome.kill();
  process.exit(failed ? 1 : 0);
}

function rmSyncSafe(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* không quan trọng */
  }
}

main().catch((e) => {
  console.error('❌ skyid-check lỗi:', e);
  process.exit(1);
});
