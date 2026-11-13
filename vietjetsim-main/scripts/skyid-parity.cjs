#!/usr/bin/env node
/**
 * Đối chiếu parity giao diện SkyID — Vietjet Air.
 *
 * Script này CHỈ đo lại 4 route auth (`/dang-nhap`, `/dang-ky`, `/quen-mat-khau`,
 * `/dat-lai-mat-khau`) ở hai viewport canonical của kế hoạch (1440×900 desktop và
 * 390×844 mobile), rồi so từng số đo với giá trị trong `docs/qa/so-do-skyid-*.md`.
 *
 * Vì sao không dùng `scripts/ui-check.cjs`? Vì script đó chụp ~70 màn hình toàn
 * site, mất hàng chục phút và phần lớn là màn booking không liên quan tới SkyID.
 * Ở đây chỉ cần 4 route × 2 viewport, đủ để chứng minh "100% khớp" mà vẫn chạy
 * trong vài giây.
 *
 * Biến môi trường:
 *   SKYID_BASE_URL  server đang chạy (mặc định http://localhost:4028)
 *   SKYID_SHOTS_DIR nơi lưu ảnh PNG (mặc định thư mục tạm)
 *   CHROME_PATH     đường dẫn Chrome
 */

const { spawn } = require('node:child_process');
const { mkdirSync, rmSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.SKYID_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS_DIR =
  process.env.SKYID_SHOTS_DIR || path.join(os.tmpdir(), 'vietjet-skyid-parity', 'shots');
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-skyid-parity', 'chrome-profile');
const PORT = 9333;

const ROUTES = [
  { name: '01-dang-nhap', url: `${BASE}/dang-nhap` },
  { name: '02-dang-ky', url: `${BASE}/dang-ky` },
  { name: '03-quen-mat-khau', url: `${BASE}/quen-mat-khau` },
  { name: '04-dat-lai-mat-khau', url: `${BASE}/dat-lai-mat-khau` },
];

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, mobile: false },
  { label: 'mobile', width: 390, height: 844, mobile: true },
];

/**
 * Số đo kỳ vọng — lấy từ `docs/qa/so-do-skyid-2026-11-13.md` (đo trên DOM sống
 * của site thật). Chỉ những giá trị *ổn định* mới được pin: số đo phụ thuộc
 * bố cục cục bộ (ví dụ `btn` phải rộng 160px khi nhãn dài, 120px khi nhãn ngắn)
 * không khớp thì cảnh báo, không fail.
 */
const EXPECTED = {
  desktop: {
    artWidth: 576,
    cardRadius: '0px 0px 16px 16px',
    titleSize: '18px',
    titleWeight: '700',
    titleColor: 'rgb(51, 51, 51)',
    subtitleSize: '14px',
    subtitleColor: 'rgb(123, 123, 123)',
    inputHeight: 32,
    inputRadius: '4px',
    inputBorder: '1px solid rgb(232, 235, 239)',
    btnHeight: 38,
    btnRadius: '8px',
    btnGradient: 'linear-gradient(135deg, rgb(233, 159, 36) 0%, rgb(255, 221, 0) 100%)',
    btnFont: 'JambonoMedium',
    footerColor: 'rgb(123, 123, 123)',
    logoHeight: 16,
    logoCount: 3,
  },
  mobile: {
    artWidth: 0,
    cardRadius: '0px 0px 16px 16px',
    titleSize: '18px',
    titleWeight: '700',
    titleColor: 'rgb(51, 51, 51)',
    subtitleSize: '14px',
    subtitleColor: 'rgb(123, 123, 123)',
    inputHeight: 32,
    inputRadius: '4px',
    inputBorder: '1px solid rgb(232, 235, 239)',
    btnHeight: 38,
    btnRadius: '8px',
    btnGradient: 'linear-gradient(135deg, rgb(233, 159, 36) 0%, rgb(255, 221, 0) 100%)',
    btnFont: 'JambonoMedium',
    footerColor: 'rgb(123, 123, 123)',
    logoHeight: 16,
    logoCount: 3,
  },
};

/** Probe chạy trong trang: gom mọi số đo cần thiết trong một lần evaluate. */
const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      color: cs.color,
      borderRadius: cs.borderRadius,
      borderTopWidth: cs.borderTopWidth,
      borderTopColor: cs.borderTopColor,
      borderTopStyle: cs.borderTopStyle,
      backgroundImage: cs.backgroundImage,
      padding: cs.padding,
    };
  };
  const art = q('.vj-skyid-art');
  const input = q('.vj-skyid-input');
  const btn = q('.vj-skyid-btn');
  const logos = [...document.querySelectorAll('.vj-skyid-footer-logos img')];
  return {
    layout: box(q('.vj-skyid-layout')),
    art: art ? { ...box(art), display: getComputedStyle(art).display } : null,
    card: box(q('.vj-skyid-card')),
    title: box(q('.vj-skyid-title')),
    subtitle: box(q('.vj-skyid-subtitle')),
    input: input ? box(input) : null,
    btn: btn ? box(btn) : null,
    footerDesc: box(q('.vj-skyid-footer-description')),
    logos: logos.map((i) => ({
      src: i.getAttribute('src'),
      h: Math.round(i.getBoundingClientRect().height),
    })),
    mainCount: document.querySelectorAll('main').length,
    mainContentCount: document.querySelectorAll('#main-content').length,
    docScrollW: document.documentElement.scrollWidth,
    docClientW: document.documentElement.clientWidth,
    h1Text: (q('h1') || {}).textContent || null,
    footerText: (q('.vj-skyid-footer-description') || {}).textContent || null,
    inputCount: document.querySelectorAll('.vj-skyid-input').length,
    btnCount: document.querySelectorAll('.vj-skyid-btn').length,
    errorText: /Đã xảy ra lỗi|Application error/.test(document.body.innerText),
  };
})()`;

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

async function attach() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const cdp = new Cdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return { cdp, targetId: target.id };
}

async function goto(cdp, url, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await cdp.send('Page.navigate', { url });
  await sleep(1800);
  // Đợi font + ảnh nền sẵn sàng để số đo không bị đo lúc layout còn chưa ổn.
  for (let i = 0; i < 20; i += 1) {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression:
        'document.readyState === "complete" && !!document.querySelector(".vj-skyid-card")',
      returnByValue: true,
    });
    if (result.value) break;
    await sleep(400);
  }
  await sleep(600);
}

function compare(label, actual, expected) {
  if (actual === expected) return { label, ok: true, actual, expected };
  if (typeof expected === 'number' && typeof actual === 'number') {
    return { label, ok: false, actual, expected, delta: actual - expected };
  }
  return { label, ok: false, actual, expected };
}

/** So một số đo đã đo với bảng kỳ vọng. */
function checkMetrics(metrics, expected) {
  const checks = [];
  const inputBorder = metrics.input
    ? `${metrics.input.borderTopWidth} ${metrics.input.borderTopStyle} ${metrics.input.borderTopColor}`
    : null;

  checks.push(compare('art width', metrics.art ? metrics.art.w : null, expected.artWidth));
  checks.push(
    compare(
      'card border-radius',
      metrics.card ? metrics.card.borderRadius : null,
      expected.cardRadius
    )
  );
  checks.push(
    compare('title font-size', metrics.title ? metrics.title.fontSize : null, expected.titleSize)
  );
  checks.push(
    compare(
      'title font-weight',
      metrics.title ? metrics.title.fontWeight : null,
      expected.titleWeight
    )
  );
  checks.push(
    compare('title color', metrics.title ? metrics.title.color : null, expected.titleColor)
  );
  checks.push(
    compare(
      'subtitle font-size',
      metrics.subtitle ? metrics.subtitle.fontSize : null,
      expected.subtitleSize
    )
  );
  checks.push(
    compare(
      'subtitle color',
      metrics.subtitle ? metrics.subtitle.color : null,
      expected.subtitleColor
    )
  );
  checks.push(
    compare('input height', metrics.input ? metrics.input.h : null, expected.inputHeight)
  );
  checks.push(
    compare(
      'input border-radius',
      metrics.input ? metrics.input.borderRadius : null,
      expected.inputRadius
    )
  );
  checks.push(compare('input border', inputBorder, expected.inputBorder));
  checks.push(compare('btn height', metrics.btn ? metrics.btn.h : null, expected.btnHeight));
  checks.push(
    compare('btn border-radius', metrics.btn ? metrics.btn.borderRadius : null, expected.btnRadius)
  );
  checks.push(
    compare('btn gradient', metrics.btn ? metrics.btn.backgroundImage : null, expected.btnGradient)
  );
  checks.push(
    compare(
      'btn font-family',
      metrics.btn ? metrics.btn.fontFamily.split(',')[0] : null,
      expected.btnFont
    )
  );
  checks.push(
    compare(
      'footer color',
      metrics.footerDesc ? metrics.footerDesc.color : null,
      expected.footerColor
    )
  );
  checks.push(compare('footer logo count', metrics.logos.length, expected.logoCount));
  checks.push(
    compare(
      'footer logo height',
      metrics.logos.length ? metrics.logos[0].h : null,
      expected.logoHeight
    )
  );
  // Vòng bảo trì: mọi route auth phải có đúng 1 `<main>` và 1 `#main-content`
  // khi ở chế độ trang (không phải overlay).
  checks.push(compare('main count', metrics.mainCount, 1));
  checks.push(compare('#main-content count', metrics.mainContentCount, 1));
  checks.push(compare('no horizontal overflow', metrics.docScrollW <= metrics.docClientW, true));
  checks.push(compare('no error page', metrics.errorText, false));
  return checks;
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true });
  rmSync(PROFILE_DIR, { recursive: true, force: true });

  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      `--user-data-dir=${PROFILE_DIR}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let report = { base: BASE, when: new Date().toISOString(), results: [] };
  let failures = 0;

  try {
    const wsUrl = await connect();
    void wsUrl;

    for (const route of ROUTES) {
      for (const viewport of VIEWPORTS) {
        const label = `${route.name}-${viewport.label}`;
        const { cdp, targetId } = await attach();
        try {
          await goto(cdp, route.url, viewport);
          const { result } = await cdp.send('Runtime.evaluate', {
            expression: PROBE,
            returnByValue: true,
          });
          const metrics = result.value;
          const checks = checkMetrics(metrics, EXPECTED[viewport.label]);
          const failed = checks.filter((c) => !c.ok);

          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          const shotPath = path.join(SHOTS_DIR, `${label}.png`);
          writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));

          if (failed.length) failures += failed.length;
          report.results.push({
            label,
            url: route.url,
            viewport,
            shot: shotPath,
            metrics,
            checks,
            failed: failed.length,
          });

          const mark = failed.length ? '✗' : '✓';
          console.log(`${mark} ${label} (${failed.length} lệch)`);
          for (const f of failed) {
            console.log(
              `    - ${f.label}: ${JSON.stringify(f.actual)} ≠ ${JSON.stringify(f.expected)}`
            );
          }
        } finally {
          try {
            await fetch(`http://127.0.0.1:${PORT}/json/close/${targetId}`);
          } catch {
            /* Chrome đã tự dọn */
          }
        }
      }
    }
  } finally {
    chrome.kill();
  }

  const reportPath = path.join(SHOTS_DIR, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nBáo cáo: ${reportPath}`);
  console.log(`Ảnh: ${SHOTS_DIR}`);
  console.log(failures ? `\n${failures} kiểm tra KHÔNG khớp.` : '\nTất cả kiểm tra khớp.');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
