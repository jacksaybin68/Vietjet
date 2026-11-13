/**
 * Đo nhanh vài thuộc tính CSS cụ thể trên trang SkyID (placeholder, focus, ...).
 *
 *   node scripts/measure-skyid-probe.cjs /dang-nhap
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.UI_CHECK_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.UI_CHECK_CDP_PORT || 9391);
const ROUTE = process.argv[2] || '/dang-nhap';
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-skyid-probe', 'chrome-profile');

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
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
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

const PROBE = `(() => {
  const input = document.querySelector('.vj-skyid-input');
  const phone = document.querySelector('.vj-skyid-phone');
  const out = {};
  if (input) {
    out.placeholderColor = getComputedStyle(input, '::placeholder').color;
    out.placeholderWeight = getComputedStyle(input, '::placeholder').fontWeight;
    out.placeholderOpacity = getComputedStyle(input, '::placeholder').opacity;
  }
  if (phone) out.phoneBoxShadow = getComputedStyle(phone).boxShadow;
  const consent = document.querySelector('.vj-skyid-consent');
  if (consent) {
    out.consentBorder = getComputedStyle(consent).border;
    out.consentSize = getComputedStyle(consent).width + 'x' + getComputedStyle(consent).height;
  }
  const pin = document.querySelector('.vj-skyid-pin');
  if (pin) {
    out.pinSize = getComputedStyle(pin).width + 'x' + getComputedStyle(pin).height;
    out.pinRadius = getComputedStyle(pin).borderRadius;
    out.pinBgImage = getComputedStyle(pin).backgroundImage;
  }
  const ghost = document.querySelector('.vj-skyid-btn-ghost');
  if (ghost) out.ghostBorder = getComputedStyle(ghost).border;
  return JSON.stringify(out, null, 2);
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
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.navigate', { url: `${BASE}${ROUTE}` });
  await sleep(3000);
  const { result } = await cdp.send('Runtime.evaluate', {
    expression: PROBE,
    returnByValue: true,
  });
  console.log(result.value);
  chrome.kill('SIGTERM');
}

main().catch((error) => {
  console.error('❌ đo thất bại:', error);
  process.exit(1);
});
