/**
 * Tìm cặp hộp trùng nhau (header + img) ở /trang-chu — dùng để truy đúng phần tử
 * `img` nào đè lên header ở viewport mobile/tablet.
 */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PORT = 9455;
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-overlap-probe', 'chrome-profile');
const BASE = process.env.UI_CHECK_BASE_URL || 'http://127.0.0.1:4041';

fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
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

  let wsUrl = null;
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const info = await res.json();
      if (info.webSocketDebuggerUrl) {
        wsUrl = info.webSocketDebuggerUrl;
        break;
      }
    } catch {
      /* chưa lên */
    }
    await sleep(250);
  }
  if (!wsUrl) throw new Error('không mở được cổng debug');

  const browserWs = new WebSocket(wsUrl);
  await new Promise((r) => browserWs.addEventListener('open', r, { once: true }));

  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    for (const fn of listeners) fn(msg);
  });
  const send = (method, params = {}) => {
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      setTimeout(() => {
        if (pending.delete(mid)) reject(new Error(`${method} timed out`));
      }, 120000);
    });
  };
  const once = (method, timeout = 60000) =>
    new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), timeout);
      const fn = (msg) => {
        if (msg.method === method) {
          clearTimeout(t);
          listeners.splice(listeners.indexOf(fn), 1);
          resolve(msg.params);
        }
      };
      listeners.push(fn);
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await once('Page.loadEventFired');
  await send('Page.navigate', { url: `${BASE}/trang-chu` });
  await sleep(6000);

  const { result } = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const header = document.querySelector('header');
      const hr = header.getBoundingClientRect();
      const hits = [];
      for (const img of document.images) {
        const r = img.getBoundingClientRect();
        if (Math.round(r.left) === Math.round(hr.left) && Math.round(r.top) === Math.round(hr.top)) {
          hits.push({
            src: (img.getAttribute('src') || '').slice(0, 120),
            alt: img.getAttribute('alt'),
            cls: (img.className || '').toString().slice(0, 140),
            inHeader: header.contains(img),
            parentCls: (img.parentElement?.className || '').toString().slice(0, 140),
            parentTag: img.parentElement?.tagName,
            rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          });
        }
      }
      return { headerRect: { x: Math.round(hr.x), y: Math.round(hr.y), w: Math.round(hr.width), h: Math.round(hr.height) }, hits };
    })()`,
  });

  console.log(JSON.stringify(result.value, null, 2));
  chrome.kill('SIGTERM');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
