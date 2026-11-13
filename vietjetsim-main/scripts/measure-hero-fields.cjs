#!/usr/bin/env node
/**
 * Đo hình học panel đặt vé ở viewport desktop chuẩn (1440×900).
 *
 * Dùng để kiểm chứng các lệch chỉnh trong `HeroBookingWidget`:
 *  - icon sân bay phải lệch 14px từ mép hộp trắng, chữ lệch 48px;
 *  - nhãn "Điểm khởi hành" không được chạm cột ngày;
 *  - hàng "Hành khách" phải nền trắng, lề trái khớp "Mã khuyến mại".
 *
 * Chạy: MEASURE_BASE_URL=http://127.0.0.1:4055 node scripts/measure-hero-fields.cjs
 */

const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const BASE = (process.env.MEASURE_BASE_URL || 'http://localhost:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.MEASURE_CDP_PORT || 9355);
const PROFILE_DIR = path.join(os.tmpdir(), 'vietjet-measure-hero', 'chrome-profile');

async function main() {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i += 1) {
      await sleep(250);
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page');
      } catch {
        /* Chrome chưa mở cổng debug — thử lại. */
      }
    }
    if (!target) throw new Error('Chrome không mở cổng debug');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        id += 1;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: `${BASE}/trang-chu` });
    // `next dev` biên dịch lần đầu chậm hơn `next start` — chờ panel dựng xong.
    let ready = false;
    for (let i = 0; i < 40 && !ready; i += 1) {
      await sleep(500);
      const probe = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('.vj-booking-panel')`,
        returnByValue: true,
      });
      ready = probe.result.value === true;
    }
    if (!ready) throw new Error('panel đặt vé không dựng trong thời hạn');

    const { result } = await send('Runtime.evaluate', {
      expression: `(() => {
        const panel = document.querySelector('.vj-booking-panel');
        if (!panel) return JSON.stringify({ error: 'khong tim thay .vj-booking-panel' });
        const pad = [...panel.querySelectorAll('div')].filter(
          (d) => typeof d.className === 'string' && d.className.includes('px-[19px]')
        )[0];
        const kids = [...pad.children];
        const row1 = kids[0];
        const row2 = kids[1];
        const paxRow = kids[2];
        const promoRow = kids[3];
        const from = document.querySelector('[aria-label="Điểm khởi hành"]');
        const to = document.querySelector('[aria-label="Điểm đến"]');
        const dep = document.querySelector('[aria-label="Ngày đi"]');
        const rel = (el, p) => Math.round(el.getBoundingClientRect().x - p.getBoundingClientRect().x);
        const fromLabel = from.querySelector('span');
        const fromIcon = from.querySelector('svg');
        const paxLabel = paxRow.querySelector('.vj-field-label');
        const paxIcon = paxRow.querySelector('svg');
        const promoLabel = promoRow.querySelector('.vj-field-label');
        return JSON.stringify({
          viewport: { w: window.innerWidth, h: window.innerHeight },
          row1Icon: rel(fromIcon, row1),
          row1Label: rel(fromLabel, row1),
          row1LabelW: Math.round(fromLabel.getBoundingClientRect().width),
          row2Label: rel(to.querySelector('span'), row2),
          gapLabelToDate: Math.round(
            dep.getBoundingClientRect().x - fromLabel.getBoundingClientRect().right
          ),
          paxBg: getComputedStyle(paxRow).backgroundColor,
          paxIcon: rel(paxIcon, paxRow),
          paxLabel: rel(paxLabel, paxRow),
          promoIcon: rel(promoRow.querySelector('svg'), promoRow),
          promoLabel: rel(promoLabel, promoRow)
        });
      })()`,
      returnByValue: true,
    });

    const data = JSON.parse(result.value);
    console.log(JSON.stringify(data, null, 2));

    const problems = [];
    if (data.row1Icon !== 14) problems.push(`icon sân bay lệch ${data.row1Icon}px (cần 14)`);
    if (data.row1Label !== 48) problems.push(`nhãn sân bay lệch ${data.row1Label}px (cần 48)`);
    if (data.row2Label !== 48) problems.push(`nhãn điểm đến lệch ${data.row2Label}px (cần 48)`);
    if (data.gapLabelToDate < 4)
      problems.push(`nhãn chạm cột ngày (hở ${data.gapLabelToDate}px)`);
    if (data.paxBg !== 'rgb(255, 255, 255)')
      problems.push(`hàng Hành khách nền ${data.paxBg} (cần trắng)`);
    if (data.paxIcon !== data.promoIcon)
      problems.push(`icon Hành khách lệch ${data.paxIcon}px vs Mã khuyến mại ${data.promoIcon}px`);
    if (data.paxLabel !== data.promoLabel)
      problems.push(`nhãn Hành khách lệch ${data.paxLabel}px vs Mã khuyến mại ${data.promoLabel}px`);

    if (problems.length) {
      console.error('\nSAI LỆCH:\n- ' + problems.join('\n- '));
      process.exitCode = 1;
    } else {
      console.log('\nOK: panel đặt vé khớp tham chiếu.');
    }
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
