#!/usr/bin/env node
/**
 * Kiểm tra giao diện thật (UI gate)
 * Run: npm run test:ui   (hoặc: node scripts/ui-check.cjs)
 *
 * Mở Google Chrome headless qua DevTools Protocol, render từng màn hình, thu
 * thập lỗi console / JS exception / HTTP và vài bất biến layout (tràn ngang,
 * box trùng khung, ảnh `src` rỗng), rồi chụp ảnh. Không cần dependency nào —
 * Node có sẵn `fetch` + `WebSocket`.
 *
 * Mỗi màn hình được chụp ở cả ba viewport canonical (xem `VIEWPORTS`) — desktop
 * 1440×900, tablet 768×1024, mobile 390×844 — nên tổng số ảnh là 3× số màn hình.
 *
 * Đây là phần bù cho `test:smoke`: smoke khẳng định HTTP của server, còn script
 * này khẳng định trang *render ra* mà không có lỗi ở phía trình duyệt — đúng chỗ
 * mà một lỗi như `src=""` tải lại cả trang hay một prefetch 404 chỉ hiện ra.
 *
 * ⚠️ Chạy trên BẢN PRODUCTION (`npm run build && npm start`), không phải `next
 * dev`: nhiều khác biệt chỉ lộ ở build thật — `next dev` không prefetch nên một
 * `router.prefetch('/dat-ve')` trỏ tới route không tồn tại chỉ sinh 404 ở đây, và
 * dev server biên dịch route theo yêu cầu nên bức ảnh dễ chụp vào lúc còn skeleton.
 *
 * Biến môi trường:
 *   UI_CHECK_BASE_URL   server đang chạy (mặc định http://localhost:4028)
 *   CHROME_PATH         đường dẫn Chrome (mặc định Google Chrome trên macOS)
 *   UI_CHECK_SHOTS_DIR  nơi lưu ảnh PNG + report.json (mặc định thư mục tạm)
 *
 * Thoát khác 0 nếu có màn hình lỗi, để CI fail rõ ràng.
 */

const { spawn } = require('node:child_process');
const { mkdirSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.UI_CHECK_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const SHOTS_DIR =
  process.env.UI_CHECK_SHOTS_DIR || path.join(os.tmpdir(), 'vietjet-ui-check', 'shots');
// Hồ sơ Chrome luôn nằm ở thư mục tạm, KHÔNG suy ra từ UI_CHECK_SHOTS_DIR: nếu
// người dùng trỏ ảnh vào trong repo (ví dụ `docs/qa/...`) thì một profile Chrome
// trong đó là rác không ai muốn commit.
const PROFILE_DIR =
  process.env.CHROME_PROFILE_DIR || path.join(os.tmpdir(), 'vietjet-ui-check', 'chrome-profile');
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const RESULTS_URL = `${BASE}/tim-ve?from=HAN&to=SGN&depart=${TOMORROW}`;

const ADMIN = { email: 'admin@vietjetair.vn', password: 'admin123' };
const USER = { email: 'user@vietjetair.vn', password: 'user123' };

/**
 * Bộ viewport canonical (khớp mục 2 của kế hoạch đối chiếu). Mọi màn hình được
 * chụp ở cả ba: `desktop` 1440×900, `tablet` 768×1024, `mobile` 390×844.
 * `tablet` trước đây chưa từng được kiểm tra, dù đây là breakpoint dễ vỡ nhất
 * với header nhiều tầng + drawer.
 */
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, mobile: false },
  { label: 'tablet', width: 768, height: 1024, mobile: true },
  { label: 'mobile', width: 390, height: 844, mobile: true },
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

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30000);
    });
  }

  once(method, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} never fired`)), timeout);
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

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
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
      state.pageErrors.push(d.exception?.description || d.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      state.consoleErrors.push(
        msg.params.args
          .map((a) => a.description || a.value || a.type)
          .join(' ')
          .slice(0, 200)
      );
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      state.consoleErrors.push(
        `[${msg.params.entry.source}] ${msg.params.entry.text}`.slice(0, 200)
      );
    }
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
      const { response, type } = msg.params;
      state.httpErrors.push(`${response.status} ${type} ${response.url}`.slice(0, 160));
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');
  return { cdp, state };
}

async function evaluate(cdp, expression) {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description || 'evaluate failed');
  }
  return res.result.value;
}

/**
 * Bấm một phím thật qua CDP. `Tab` phải là `rawKeyDown` còn `Enter` phải gửi kèm
 * `text` thì Chrome mới bắn `click` cho `<a>` đang focus (nó làm điều đó ngay trong
 * `keyDown`), và chỉ khi đó phép thử mới là "người dùng bấm phím", không phải
 * `element.click()` chạy bằng script.
 */
async function pressKey(cdp, key) {
  const isTab = key === 'Tab';
  const code = isTab ? 'Tab' : 'Enter';
  const vk = isTab ? 9 : 13;
  await cdp.send('Input.dispatchKeyEvent', {
    type: isTab ? 'rawKeyDown' : 'keyDown',
    key,
    code,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk,
    ...(isTab ? {} : { text: '\r' }),
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk,
  });
}

/**
 * Chờ trang thật sự đứng yên: URL + số ký tự văn bản + số node không đổi trong
 * `quietMs`, VÀ không còn skeleton. Dev server biên dịch route theo yêu cầu, nên
 * một `sleep` cố định hay chụp đúng lúc React còn đang render hoặc đang chuyển
 * trang — console quản trị từng bị chụp khi bảng còn toàn khung xám, vì khung xám
 * đứng yên 800ms trong lúc chờ API.
 */
const SETTLED_PROBE = `JSON.stringify({
  url: location.pathname + location.search,
  text: document.body.innerText.length,
  nodes: document.querySelectorAll('*').length,
  skeletons: document.querySelectorAll('.skeleton-pulse, .skeleton-base, .skeleton-card, .skeleton-accent, .skeleton-accent-bar, .skeleton-row, .skeleton-shimmer').length,
})`;

async function waitForStable(cdp, { maxMs = 15000, quietMs = 800 } = {}) {
  const start = Date.now();
  let last = '';
  let lastChange = Date.now();
  while (Date.now() - start < maxMs) {
    const raw = await evaluate(cdp, SETTLED_PROBE);
    const snap = JSON.parse(raw);
    if (raw !== last) {
      last = raw;
      lastChange = Date.now();
    } else if (snap.skeletons === 0 && Date.now() - lastChange > quietMs) {
      return { snapshot: raw, stable: true };
    }
    await sleep(250);
  }
  return { snapshot: last, stable: false };
}

async function goto(cdp, url, { width = 1440, height = 900, mobile = false } = {}) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile,
  });
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
  return waitForStable(cdp);
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(SHOTS_DIR, `${name}.png`), Buffer.from(data, 'base64'));
  return `shots/${name}.png`;
}

/**
 * `overlappedBoxes` bỏ qua cặp cha–con (một <button> và <img> bên trong nó luôn
 * trùng khung), nên chỉ còn những chồng lấn thật.
 */
const PROBE = `(() => {
  const de = document.documentElement;
  const nodes = [...document.querySelectorAll('h1, h2, header, footer, button, input, img')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2;
  });
  const seen = new Map();
  const overlapped = [];
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    const key = Math.round(r.left) + ':' + Math.round(r.top);
    const prev = seen.get(key);
    if (prev && !prev.contains(el) && !el.contains(prev)) {
      overlapped.push(prev.tagName + '+' + el.tagName + ' @' + key);
    } else if (!prev) {
      seen.set(key, el);
    }
  }
  const images = [...document.images];
  return {
    url: location.pathname + location.search,
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 2),
    header: !!document.querySelector('header'),
    footer: !!document.querySelector('footer'),
    overflowX: de.scrollWidth - de.clientWidth,
    bodyText: document.body.innerText.replace(/\\s+/g, ' ').trim().length,
    buttons: document.querySelectorAll('button').length,
    inputs: document.querySelectorAll('input').length,
    images: images.length,
    emptySrcImages: images.filter((i) => !(i.getAttribute('src') || '').trim()).length,
    /* Landmark: đúng một thẻ main, đúng một đích #main-content, không lồng nhau, và
       đích phải nằm SAU header trong thứ tự document — nếu không thì skip link trỏ
       đúng vào thanh điều hướng mà nó sinh ra để bỏ qua. Cả bốn điều này chỉ đúng
       sau hydration: ba route (/dang-nhap, /dat-lai-mat-khau, /lam-thu-tuc) đọc
       useSearchParams nên HTML thô chỉ có fallback rỗng. */
    mainCount: document.querySelectorAll('main').length,
    mainContentCount: document.querySelectorAll('#main-content').length,
    nestedMain: [...document.querySelectorAll('main')].filter((m) => m.parentElement.closest('main'))
      .length,
    mainAfterHeader: (() => {
      const main = document.querySelector('#main-content');
      const header = document.querySelector('header');
      if (!main || !header) return null;
      return !!(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING);
    })(),
    overlappedBoxes: overlapped.slice(0, 5),
    theme: de.classList.contains('dark') ? 'dark' : 'light',
    bg: getComputedStyle(document.body).backgroundColor,
  };
})()`;

async function main() {
  rmSync(SHOTS_DIR, { recursive: true, force: true });
  mkdirSync(SHOTS_DIR, { recursive: true });
  // Hồ sơ Chrome dùng lại từ lần trước vẫn giữ cookie phiên, và `/dang-nhap` của
  // một phiên admin bị proxy đưa thẳng sang `/quan-tri` — nên ảnh "trang đăng
  // nhập" hoá ra là console. Mỗi lần chạy phải là khách mới.
  rmSync(PROFILE_DIR, { recursive: true, force: true });

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
  const { cdp, state } = await attach();
  const results = [];

  const reset = () => {
    state.consoleErrors.length = 0;
    state.pageErrors.length = 0;
    state.httpErrors.length = 0;
  };

  const capture = async (name, url, { viewport = VIEWPORTS[0], interact } = {}) => {
    reset();
    const stability = await goto(cdp, url, viewport);
    const probe = await evaluate(cdp, PROBE);
    const screen = `${name}-${viewport.label}`;
    const file = await shot(cdp, screen);
    results.push({
      screen,
      viewport: viewport.label,
      requestedUrl: url,
      stable: stability.stable,
      probe,
      consoleErrors: [...state.consoleErrors],
      pageErrors: [...state.pageErrors],
      // 401 là chủ ý ở các trang cần session; các mã khác mới đáng báo.
      httpErrors: state.httpErrors.filter((e) => !e.startsWith('401 ')),
      file,
      ...(interact ? await interact(cdp) : {}),
    });
  };

  // Một màn hình ở cả ba viewport canonical. Thứ tự desktop → tablet → mobile
  // để ảnh desktop vẫn là cái nhìn đầu tiên khi đọc report.
  const captureAll = async (name, url) => {
    for (const viewport of VIEWPORTS) await capture(name, url, { viewport });
  };

  // 10 route công khai, mỗi route ở cả ba viewport canonical.
  await captureAll('01-trang-chu', `${BASE}/trang-chu`);
  await captureAll('02-ket-qua-tim-ve', RESULTS_URL);
  await captureAll('03-dang-nhap', `${BASE}/dang-nhap`);
  await captureAll('04-tra-cuu', `${BASE}/tra-cuu`);
  await captureAll('05-lam-thu-tuc', `${BASE}/lam-thu-tuc`);
  await captureAll('06-chuyen-bay-cua-toi', `${BASE}/chuyen-bay-cua-toi`);
  await captureAll('07-dich-vu-hanh-ly', `${BASE}/dich-vu?service=baggage`);
  await captureAll('08-gioi-thieu', `${BASE}/gioi-thieu`);
  await captureAll('09-hoi-dap', `${BASE}/hoi-dap`);
  await captureAll('10-lien-he', `${BASE}/lien-he`);

  const login = async (who) => {
    await goto(cdp, `${BASE}/dang-nhap`);
    return evaluate(
      cdp,
      `(async () => {
        const csrf = (document.cookie.match(/csrf_token=([^;]+)/) || [])[1];
        const res = await fetch('/api/xac-thuc/dang-nhap', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify({ email: ${JSON.stringify(who.email)}, password: ${JSON.stringify(who.password)} }),
        });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, role: body.user && body.user.role };
      })()`
    );
  };

  const userLogin = await login(USER);
  await captureAll('11-tai-khoan-vi', `${BASE}/tai-khoan`);
  const adminLogin = await login(ADMIN);
  // `/quan-tri` là console nghiệp vụ desktop-first (AGENTS.md: "không ép giao
  // diện public lên console nghiệp vụ"), nên kiểm desktop + tablet và bỏ mobile
  // — bảng dữ liệu dày không có thiết kế mobile để đối chiếu.
  for (const viewport of VIEWPORTS.filter((v) => v.label !== 'mobile')) {
    await capture('12-quan-tri-tong-quan', `${BASE}/quan-tri`, { viewport });
  }

  // ── Widget OpenClaw: mở panel, đọc nhãn backend và thử gửi một câu ─────────
  const widgetLauncher = `[...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').includes('OpenClaw'))`;
  const widget = { launcherFound: await evaluate(cdp, `!!${widgetLauncher}`) };
  if (widget.launcherFound) {
    await evaluate(cdp, `(() => { (${widgetLauncher}).click(); return true; })()`);
    await sleep(2000);
    widget.panel = await evaluate(
      cdp,
      `(() => {
        const label = [...document.querySelectorAll('div, p, span')]
          .map((e) => (e.innerText || '').trim())
          .find((t) => t.startsWith('Đang trực tuyến') || t.startsWith('Ollama') || t.startsWith('OpenClaw Gateway'));
        const input = document.getElementById('openclaw-input');
        return {
          statusLabel: label ? label.split('\\n')[0].slice(0, 80) : null,
          hasInput: !!input,
          inputPlaceholder: input ? input.getAttribute('placeholder') : null,
        };
      })()`
    );
    widget.file = await shot(cdp, '13-openclaw-widget');

    // Gửi thử một câu để xem luồng chat thật (Ollama ngoại tuyến ⇒ phải trả lời
    // lịch sự, không được hiện khung trống hay lỗi).
    if (widget.panel?.hasInput) {
      widget.send = await evaluate(
        cdp,
        `(async () => {
          const input = document.getElementById('openclaw-input');
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'Cập nhật chuyến bay HAN-SGN hôm nay');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise((r) => setTimeout(r, 200));
          const button = input.parentElement.querySelector('button');
          if (button && !button.disabled) button.click();
          return { typed: true, clicked: !!button && !button.disabled };
        })()`
      );
      await sleep(3000);
      widget.afterSend = await evaluate(
        cdp,
        `(() => {
          const text = document.body.innerText || '';
          return {
            hasOfflineNotice: /ngoại tuyến|Ngoại tuyến/.test(text),
            hasErrorBubble: /Lỗi|error|Error/.test(text),
            tail: text.replace(/\\s+/g, ' ').slice(-220),
          };
        })()`
      );
      widget.afterSendFile = await shot(cdp, '14-openclaw-sau-khi-gui');
    }
  }

  // ── Skip link: hành vi thật, không chỉ cấu trúc DOM ────────────────────────
  // Cấu trúc mà PROBE kiểm (một `#main-content`, nằm sau `<header>`) là điều kiện
  // cần, không phải điều kiện đủ — nó không cho biết bàn phím có thật sự đi qua
  // thanh điều hướng. Ở đây: Tab đầu tiên phải rơi vào đúng skip link, Enter phải
  // đặt đích về `#main-content`, và Tab kế tiếp phải nằm *trong* `#main-content`.
  await goto(cdp, `${BASE}/trang-chu`, VIEWPORTS[0]);
  const skip = {
    inDom: await evaluate(cdp, `!!document.querySelector('a[href="#main-content"]')`),
  };
  if (skip.inDom) {
    // Chuẩn hoá điểm xuất phát của Tab tuần tự về đầu document.
    await evaluate(cdp, `(document.activeElement && document.activeElement.blur(), true)`);
    await pressKey(cdp, 'Tab');
    skip.firstTabIsSkipLink = await evaluate(
      cdp,
      `document.activeElement === document.querySelector('a[href="#main-content"]')`
    );
    if (skip.firstTabIsSkipLink) {
      await pressKey(cdp, 'Enter');
      await sleep(300);
      skip.hash = await evaluate(cdp, `location.hash`);
      await pressKey(cdp, 'Tab');
      skip.nextTabInMain = await evaluate(
        cdp,
        `(() => {
          const main = document.querySelector('#main-content');
          const el = document.activeElement;
          return !!main && !!el && el !== document.body && main.contains(el);
        })()`
      );
      skip.nextTabTag = await evaluate(
        cdp,
        `(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return 'body';
          return el.tagName + (el.id ? '#' + el.id : '') +
            (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
        })()`
      );
    }
  }

  chrome.kill('SIGTERM');
  writeFileSync(
    path.join(SHOTS_DIR, 'report.json'),
    JSON.stringify(
      { base: BASE, results, widget, skip, logins: { user: userLogin, admin: adminLogin } },
      null,
      2
    )
  );

  console.log('\n=== KIỂM TRA GIAO DIỆN ===');
  console.log(`Server: ${BASE}  ·  ảnh: ${SHOTS_DIR}\n`);

  let failed = 0;

  // Skip link kiểm một lần cho cả lượt chạy, không theo từng màn hình.
  const skipFlags = [];
  if (skip.inDom && skip.firstTabIsSkipLink === false)
    skipFlags.push('Tab đầu tiên không vào skip link');
  if (skip.firstTabIsSkipLink && skip.hash !== '#main-content')
    skipFlags.push(`Enter không đưa đích về #main-content (hash=${skip.hash})`);
  if (skip.firstTabIsSkipLink && skip.nextTabInMain === false)
    skipFlags.push(`Tab kế tiếp không nằm trong #main-content (${skip.nextTabTag})`);
  if (skipFlags.length) failed += 1;

  for (const r of results) {
    const flags = [];
    if (r.probe.overflowX > 1) flags.push(`TRÀN NGANG ${r.probe.overflowX}px`);
    if (r.probe.overlappedBoxes.length)
      flags.push(`BOX TRÙNG: ${r.probe.overlappedBoxes.join(', ')}`);
    if (r.probe.emptySrcImages) flags.push(`IMG SRC RỖNG x${r.probe.emptySrcImages}`);
    if (r.probe.mainCount !== 1) flags.push(`SỐ <main> = ${r.probe.mainCount} (phải đúng 1)`);
    if (r.probe.nestedMain) flags.push(`<main> LỒNG NHAU x${r.probe.nestedMain}`);
    if (r.probe.mainContentCount !== 1)
      flags.push(`#main-content x${r.probe.mainContentCount} (phải đúng 1)`);
    if (r.probe.mainAfterHeader === false)
      flags.push('#main-content KHÔNG nằm sau <header> — skip link không bỏ qua được nav');
    if (r.consoleErrors.length) flags.push(`console.error x${r.consoleErrors.length}`);
    if (r.pageErrors.length) flags.push(`JS exception x${r.pageErrors.length}`);
    if (r.httpErrors.length) flags.push(`HTTP lỗi x${r.httpErrors.length}`);
    if (!r.stable) flags.push('trang chưa ổn định');
    if (r.probe.bodyText < 200) flags.push('nội dung quá ngắn');
    if (flags.length) failed += 1;
    console.log(
      `${flags.length ? '⚠️ ' : '✅ '}${r.screen.padEnd(24)} ${r.probe.url} ` +
        `| h1=${JSON.stringify(r.probe.h1)} | header=${r.probe.header} footer=${r.probe.footer} ` +
        `| text=${r.probe.bodyText} imgs=${r.probe.images} | ${r.file}` +
        (flags.length ? `\n      → ${flags.join(' · ')}` : '')
    );
    for (const e of r.pageErrors.slice(0, 2)) console.log(`      JS: ${e.split('\n')[0]}`);
    for (const e of r.consoleErrors.slice(0, 2)) console.log(`      console: ${e}`);
    for (const e of r.httpErrors.slice(0, 2)) console.log(`      http: ${e}`);
  }

  console.log(
    `${skipFlags.length ? '⚠️ ' : '✅ '}skip-link  ` +
      `Tab đầu tiên = skip link: ${skip.firstTabIsSkipLink} · Enter → hash=${skip.hash} · ` +
      `Tab kế tiếp trong #main-content: ${skip.nextTabInMain} (${skip.nextTabTag})` +
      (skipFlags.length ? `\n      → ${skipFlags.join(' · ')}` : '')
  );
  console.log(`\nWidget OpenClaw: launcher=${widget.launcherFound}`);
  if (widget.panel) console.log(`   nhãn trạng thái: ${widget.panel.statusLabel}`);
  if (widget.send) console.log(`   gửi thử: ${JSON.stringify(widget.send)}`);
  if (widget.afterSend) console.log(`   sau khi gửi: ${JSON.stringify(widget.afterSend)}`);
  console.log(`\nĐăng nhập: user=${JSON.stringify(userLogin)} admin=${JSON.stringify(adminLogin)}`);

  if (failed > 0) {
    console.error(`\n❌ UI check: ${failed}/${results.length} màn hình có lỗi.`);
    process.exit(1);
  }
  console.log(`\n✅ UI check passed — ${results.length}/${results.length} màn hình sạch.`);
}

main().catch((error) => {
  console.error('❌ ui-check lỗi:', error);
  process.exit(1);
});
