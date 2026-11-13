/**
 * Đo nhanh bố cục SkyID trên bản chạy local, đối chiếu với số đo site thật.
 *
 * Dùng đúng cách attach CDP của `scripts/ui-check.cjs` (Chrome headless + port
 * debug), nhưng chỉ đo — không chụp ảnh, không đăng nhập.
 *
 *   node scripts/measure-skyid-layout.cjs [path]
 *
 * Mặc định đo `/dang-nhap` ở 1440×900 và 390×844.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.UI_CHECK_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.UI_CHECK_CDP_PORT || 9345);
const ROUTE = process.argv[2] || '/dang-nhap';
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-skyid-measure', 'chrome-profile');

const VIEWPORTS = [
  { label: 'desktop 1440x900', width: 1440, height: 900 },
  { label: 'mobile 390x844', width: 390, height: 844 },
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

  once(method, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter((l) => l !== fn);
        reject(new Error(`${method} never fired`));
      }, timeout);
      const fn = (msg) => {
        if (msg.method === method) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter((l) => l !== fn);
          resolve(msg.params);
        }
      };
      this.listeners.push(fn);
    });
  }
}

async function httpJson(url) {
  const res = await fetch(url);
  return res.json();
}

/** Chrome cần vài trăm ms để mở cổng debug — chờ thay vì đoán. */
async function waitForChrome() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const info = await res.json();
      if (info.webSocketDebuggerUrl) return;
    } catch {
      /* chưa lên */
    }
    await sleep(250);
  }
  throw new Error('Chrome không mở cổng debug');
}

async function attach() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return { cdp, targetId: target.id };
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
}

const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height),
      fontSize: c.fontSize, lineHeight: c.lineHeight, fontWeight: c.fontWeight,
      color: c.color, background: c.backgroundColor, backgroundImage: c.backgroundImage,
      borderRadius: c.borderRadius, border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
      fontFamily: c.fontFamily,
    };
  };
  const layout = q('.vj-skyid-layout');
  return {
    viewport: innerWidth + 'x' + innerHeight,
    docScrollWidth: document.documentElement.scrollWidth,
    mainCount: document.querySelectorAll('main').length,
    mainContentCount: document.querySelectorAll('#main-content').length,
    headerCount: document.querySelectorAll('header').length,
    layout: box(layout),
    card: box(q('.vj-skyid-card')),
    title: box(q('.vj-skyid-title')),
    subtitle: box(q('.vj-skyid-subtitle')),
    label: box(q('.vj-skyid-label')),
    input: box(q('.vj-skyid-input')),
    phone: box(q('.vj-skyid-phone')),
    btn: box(q('.vj-skyid-btn')),
    logoRed: box(q('.vj-skyid-logo-red')),
    logoWhite: box(q('.vj-skyid-logo-white')),
    footerDescription: box(q('.vj-skyid-footer-description')),
    footerLogoHeight: (() => { const i = q('.vj-skyid-footer-logos img'); return i ? Math.round(i.getBoundingClientRect().height) : null; })(),
    images: [...document.querySelectorAll('img')].map((i) => ({
      src: i.getAttribute('src'),
      w: Math.round(i.getBoundingClientRect().width),
      h: Math.round(i.getBoundingClientRect().height),
      natural: i.naturalWidth + 'x' + i.naturalHeight,
    })),
  };
})()`;

async function main() {
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${PROFILE_DIR}`,
    'about:blank',
  ]);
  chrome.stderr.on('data', () => {});
  await waitForChrome();

  const report = {};
  try {
    for (const vp of VIEWPORTS) {
      const { cdp } = await attach();
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 700,
      });
      const loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', { url: `${BASE}${ROUTE}` });
      await loaded;
      await sleep(2500);
      report[vp.label] = await evaluate(cdp, PROBE);
    }
  } finally {
    chrome.kill('SIGTERM');
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('❌ đo thất bại:', error);
  process.exit(1);
});
