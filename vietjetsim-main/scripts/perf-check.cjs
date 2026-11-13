#!/usr/bin/env node
/**
 * Cổng chất lượng hiệu năng (Lighthouse) — Phase 6, mục 3.
 * Run: npm run test:perf   (hoặc: node scripts/perf-check.cjs)
 *
 * Đo các chỉ số mà Phase 6 của kế hoạch đối chiếu giao diện còn để trống:
 * "ảnh `next/image` hoặc `<img>` có kích thước cố định, preload hero đúng một
 * ảnh, font không gây CLS" — và LCP của trang chủ.
 *
 * Vì sao dùng CDP thay vì `lighthouse` CLI:
 *   - `lighthouse` là dependency nặng (~30 MB, kéo theo cả chuỗi audit), cài
 *     vào `devDependencies` chỉ để đọc 4 con số là tỉ lệ chi phí không đáng.
 *   - Những gì Phase 6 thực sự cần — LCP, CLS, và "ảnh nào là LCP element" —
 *     đều lấy trực tiếp từ `PerformanceObserver` và `Performance.getMetrics`,
 *     tức là đúng dữ liệu Lighthouse đọc, nhưng không phải qua lớp audit.
 *   - Script này chạy được chỉ với Node + Chrome, đúng như `ui-check.cjs`
 *     đã làm — không thêm dependency mới nào.
 *
 * Chạy trên BẢN PRODUCTION (`npm run build && npm start`), không phải `next dev`:
 * `next dev` không prefetch, không sinh manifest tối ưu, và CLS/LCP đo trên dev
 * không đại diện được cho người dùng thật.
 *
 * Biến môi trường:
 *   PERF_BASE_URL        server đang chạy (mặc định http://127.0.0.1:4028)
 *   CHROME_PATH         đường dẫn Chrome (mặc định Google Chrome trên macOS)
 *   PERF_CDP_PORT       cổng debug CDP (mặc định 9334 — khác 9333 của ui-check
 *                       để hai lượt chạy song song không tranh cổng)
 *   PERF_OUT            nơi lưu report.json (mặc định thư mục tạm)
 *   PERF_MAX_LCP_MS     ngưỡng LCP tối đa (mặc định 2500)
 *   PERF_MAX_CLS        ngưỡng CLS tối đa (mặc định 0.1)
 *   PERF_SKIP_LCP       đặt "1" để bỏ qua phép đo LCP (trang nào không có
 *                       content paint nào cũng không LCP được)
 *
 * Thoát khác 0 nếu có chỉ số vượt ngưỡng, để CI fail rõ ràng.
 */

const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.PERF_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.PERF_CDP_PORT || 9334);
const OUT_DIR = process.env.PERF_OUT || path.join(os.tmpdir(), 'vietjet-perf-check');
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-perf-check', 'chrome-profile');

const MAX_LCP_MS = Number(process.env.PERF_MAX_LCP_MS || 2500);
const MAX_CLS = Number(process.env.PERF_MAX_CLS || 0.1);
const SKIP_LCP = process.env.PERF_SKIP_LCP === '1';

/**
 * Ngưỡng này KHÔNG phải ngưỡng "đạt/không đạt" của Lighthouse mặc định (90 điểm).
 * Phase 1 của kế hoạch đặt "≥90" là mục tiêu, không phải số đo — và điểm số tổng
 * hợp phụ thuộc vào mạng của người chạy, nên nó không tái lập được trong CI.
 * Ở đây đo trực tiếp hai thứ có nghĩa với người dùng và tái lập được:
 * LCP (khi nào nội dung chính hiện ra) và CLS (trang có nhảy layout không).
 */
const PAGES = [
  { name: 'trang-chu', url: `${BASE}/trang-chu` },
  { name: 'ket-qua-tim-ve', url: `${BASE}/tim-ve?from=HAN&to=SGN&depart=${tomorrow()}` },
  { name: 'gioi-thieu', url: `${BASE}/gioi-thieu` },
];

/** Ngày mai — lịch bay được seed tương lai, hôm nay không có chuyến nào để tìm. */
function tomorrow() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

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

async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* Chrome chưa lên — thử lại. */
    }
    await sleep(250);
  }
  throw new Error('Không kết nối được Chrome CDP');
}

async function evaluate(cdp, expression, timeout = 30000) {
  const res = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    timeout
  );
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description || 'evaluate failed');
  }
  return res.result.value;
}

/**
 * Thu thập chỉ số hiệu năng ngay trong trang, bằng đúng những API Lighthouse đọc:
 *  - `layout-shift` (CLS): tổng các shift chưa có input người dùng.
 *  - `largest-contentful-paint`: candidate cuối cùng còn hiệu lực.
 *  - `paint`: FCP.
 *
 * `hadRecentInput` bị loại vì đúng như đặc tả CLS: shift do người dùng chủ
 * động kéo/click không tính vào CLS.
 *
 * Observer phải được cài TRƯỚC khi trang tải, nên script điều hướng tới
 * `about:blank` rồi bật observer qua `Page.addScriptToEvaluateOnNewDocument`
 * trước khi `Page.navigate` — nếu không, LCP/CLS của lần tải đầu tiên không
 * được ghi lại và phép đo chỉ ra 0 một cách vô nghĩa.
 */
const PERF_PROBE = `
(() => {
  window.__vjPerf = { cls: 0, lcp: null, fcp: null, shifts: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__vjPerf.cls += entry.value;
          window.__vjPerf.shifts += 1;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { window.__vjPerf.clsError = String(e); }
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__vjPerf.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) { window.__vjPerf.lcpError = String(e); }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') window.__vjPerf.fcp = entry.startTime;
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (e) { window.__vjPerf.fcpError = String(e); }
})();
`;

/**
 * Ảnh nào là LCP element, và ảnh đó có kích thước cố định không.
 *
 * Đây là phần "ảnh `next/image` hoặc `<img>` có kích thước cố định" của Phase 6:
 * một `<img>` không có `width`/`height` (và không có `aspect-ratio` từ CSS) sẽ
 * đẩy layout khi ảnh tải xong — đó là nguồn CLS phổ biến nhất. Báo cáo ảnh nào
 * thiếu kích thước để biết chính xác cần sửa ảnh nào, không phải "CLS cao".
 */
const IMAGE_AUDIT = `(() => {
  const imgs = [...document.images];
  return {
    total: imgs.length,
    withoutIntrinsicSize: imgs
      .filter((img) => {
        const hasAttr = img.getAttribute('width') && img.getAttribute('height');
        if (hasAttr) return false;
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !(r.width > 0 && r.height > 0 && img.style.aspectRatio);
      })
      .map((img) => ({
        src: (img.currentSrc || img.src || '').split('/').pop().slice(0, 60),
        natural: img.naturalWidth ? img.naturalWidth + 'x' + img.naturalHeight : 'chưa tải',
        rendered: Math.round(img.getBoundingClientRect().width) + 'x' + Math.round(img.getBoundingClientRect().height),
        nextImage: img.getAttribute('data-nimg') === '1',
      }))
      .slice(0, 10),
    lcpElement: (() => {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      const last = entries[entries.length - 1];
      if (!last || !last.element) return null;
      const el = last.element;
      return {
        tag: el.tagName,
        src: (el.currentSrc || el.src || '').split('/').pop().slice(0, 60),
        size: el.getBoundingClientRect().width + 'x' + el.getBoundingClientRect().height,
      };
    })(),
    /* Preload: yêu cầu của Phase 6 là "preload hero đúng một ảnh" — nhiều hơn
       một preloaded ảnh là thừa (mỗi preload tốn băng thông tranh nhau với
       ảnh LCP), ít hơn thì ảnh hero bị trễ. */
    preloadedImages: [...document.querySelectorAll('link[rel="preload"][as="image"]')].map(
      (l) => (l.getAttribute('href') || '').split('/').pop().slice(0, 60)
    ),
    fontDisplaySwap: [...document.querySelectorAll('link[rel="stylesheet"]')].filter((l) =>
      (l.getAttribute('href') || '').includes('fonts.googleapis.com')
    ).length,
    webfontsLoaded: document.fonts ? document.fonts.status : null,
  };
})()`;

async function attach() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  return { cdp, targetId: target.id };
}

async function closeTarget(targetId) {
  try {
    await fetch(`http://127.0.0.1:${PORT}/json/close/${targetId}`);
  } catch {
    /* Chrome đã tự dọn. */
  }
}

async function measure(page) {
  const { cdp, targetId } = await attach();
  try {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // Không throttle mạng: phép đo này đo CHẤT LƯỢNG CODE (ảnh có kích thước
    // cố định không, font có CLS không), không đo tốc độ đường truyền. Một
    // ngưỡng LCP phụ thuộc mạng sẽ đỏ trên máy chậm và xanh trên máy nhanh —
    // tức là không tái lập được, nên không có giá trị làm cổng.
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: PERF_PROBE });
    await cdp.send('Page.navigate', { url: page.url });
    // Chờ tải xong rồi thêm một khoảng nữa: LCP candidate cuối cùng và các
    // layout shift xuất hiện LÂU SAU load (ảnh lazy, font swap, banner nở ra).
    await sleep(6000);

    const perf = await evaluate(cdp, 'JSON.stringify(window.__vjPerf || {})');
    const images = await evaluate(cdp, IMAGE_AUDIT);
    const nav = await evaluate(
      cdp,
      `(() => {
        const n = performance.getEntriesByType('navigation')[0];
        if (!n) return null;
        return {
          ttfb: Math.round(n.responseStart),
          domContentLoaded: Math.round(n.domContentLoadedEventEnd),
          load: Math.round(n.loadEventEnd),
          transferSize: n.transferSize,
          resources: performance.getEntriesByType('resource').length,
        };
      })()`
    );

    const parsed = JSON.parse(perf || '{}');
    const lcp = typeof parsed.lcp === 'number' ? Math.round(parsed.lcp) : null;
    const cls = Number((parsed.cls || 0).toFixed(4));
    const fcp = typeof parsed.fcp === 'number' ? Math.round(parsed.fcp) : null;

    const flags = [];
    if (!SKIP_LCP && lcp !== null && lcp > MAX_LCP_MS) {
      flags.push(`LCP ${lcp}ms > ${MAX_LCP_MS}ms`);
    }
    if (cls > MAX_CLS) flags.push(`CLS ${cls} > ${MAX_CLS}`);
    if (parsed.clsError) flags.push(`lỗi đọc CLS: ${parsed.clsError}`);
    if (parsed.lcpError) flags.push(`lỗi đọc LCP: ${parsed.lcpError}`);
    // Ảnh không có kích thước cố định là nguyên nhân gốc của CLS trên web
    // ảnh — báo riêng để lỗi không bị chôn dưới một con số CLS tổng.
    if (images.withoutIntrinsicSize.length) {
      flags.push(`${images.withoutIntrinsicSize.length} ảnh không có width/height`);
    }
    if (images.preloadedImages.length > 1) {
      flags.push(`${images.preloadedImages.length} ảnh preload (nên ≤ 1)`);
    }

    return {
      page: page.name,
      url: page.url,
      lcp,
      cls,
      fcp,
      layoutShifts: parsed.shifts || 0,
      navigation: nav,
      images,
      flags,
    };
  } finally {
    await closeTarget(targetId);
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${PROFILE_DIR}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    await connect();
    const results = [];
    for (const page of PAGES) {
      console.log(`  → ${page.name}`);
      const r = await measure(page);
      results.push(r);
      console.log(
        `     LCP=${r.lcp}ms  CLS=${r.cls}  FCP=${r.fcp}ms  ảnh=${r.images.total} ` +
          `(${r.images.withoutIntrinsicSize.length} thiếu kích thước)  preload=${r.images.preloadedImages.length}` +
          (r.flags.length ? `\n     → ${r.flags.join(' · ')}` : '')
      );
    }

    writeFileSync(
      path.join(OUT_DIR, 'report.json'),
      JSON.stringify({ base: BASE, thresholds: { lcpMs: MAX_LCP_MS, cls: MAX_CLS }, results }, null, 2)
    );

    console.log('\n=== CỔNG HIỆU NĂNG ===');
    console.log(`Server: ${BASE}  ·  ngưỡng LCP ≤ ${MAX_LCP_MS}ms · CLS ≤ ${MAX_CLS}\n`);
    let failed = 0;
    for (const r of results) {
      if (r.flags.length) failed += 1;
      console.log(`${r.flags.length ? '⚠️ ' : '✅ '}${r.page.padEnd(18)} LCP=${r.lcp}ms CLS=${r.cls}`);
    }

    if (failed > 0) {
      console.error(`\n❌ Perf check: ${failed}/${results.length} trang vượt ngưỡng.`);
      process.exit(1);
    }
    console.log(`\n✅ Perf check passed — ${results.length}/${results.length} trang trong ngưỡng.`);
  } finally {
    chrome.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error('❌ perf-check lỗi:', error);
  process.exit(1);
});
