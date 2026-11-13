#!/usr/bin/env node
/**
 * probe-official-totalrow.cjs — xác nhận màu nền + màu chữ của DÒNG "Tổng tiền"
 * trong panel "THÔNG TIN ĐẶT CHỖ" của site thật (desktop 1440×900).
 *
 * Site thỉnh thoảng redirect `/vi/select-flight` → `/VI/` và làm mất trang,
 * nên script thử lại nhiều lần cho tới khi URL giữ `select-flight` VÀ body có
 * "Thông tin đặt chỗ".
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-total-row.json
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const OUT = path.resolve(
  __dirname,
  '..',
  'docs',
  'qa',
  '2026-11-13-vietjet-measure',
  'official-total-row.json'
);

const URL_OFFICIAL =
  'https://newweb.vietjetair.com/vi/select-flight?departAirport=HAN&arrivalAirport=SGN&departDate=2026-11-20&adult=1&child=0&infant=0';

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

const PROBE = () => {
  const snap = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 90),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage.slice(0, 140),
      radius: c.borderRadius,
      border: c.border,
      padding: c.padding,
    };
  };

  const all = (s) => Array.from(document.querySelectorAll(s));
  const totals = all('div,span,p,h3,h4,h5')
    .filter((el) => /^tổng tiền$/i.test((el.textContent || '').trim()))
    // Bỏ qua phần tử cha bao trọn (chứa cả "Chi tiết"/"Đi tiếp").
    .filter((el) => el.children.length <= 2);

  const chains = totals.slice(0, 4).map((el) => {
    const chain = [];
    let n = el;
    for (let i = 0; i < 8 && n; i++) {
      chain.push(snap(n));
      n = n.parentElement;
    }
    return chain;
  });

  // Số tiền trong panel (nằm cùng hàng với nhãn "Tổng tiền").
  const label = totals[0];
  const amount = label
    ? (() => {
        let row = label;
        for (let i = 0; i < 3 && row; i++) {
          const r = row.getBoundingClientRect();
          if (r.width > 250) break;
          row = row.parentElement;
        }
        if (!row) return null;
        const cand = Array.from(row.querySelectorAll('*')).filter(
          (el) => /vnd/i.test(el.textContent || '') && (el.textContent || '').trim().length < 24
        );
        return cand.length ? snap(cand[cand.length - 1]) : null;
      })()
    : null;

  // Thanh đáy cố định của trang chọn chuyến bay.
  const cta = all('button,a').find((el) => /^đi tiếp$/i.test((el.textContent || '').trim()));
  let bar = cta;
  for (let i = 0; i < 6 && bar; i++) {
    const r = bar.getBoundingClientRect();
    if (r.width > 900) break;
    bar = bar.parentElement;
  }

  return {
    url: location.href,
    chains,
    amount,
    bottomBar: snap(bar),
    bottomBarChildren: bar ? Array.from(bar.children).map(snap) : [],
  };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  let data = null;
  for (let attempt = 1; attempt <= 5 && !data; attempt++) {
    try {
      await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await new Promise((r) => setTimeout(r, 6000));
      if (!/select-flight/i.test(page.url())) {
        console.log(`lần ${attempt}: bị redirect về ${page.url()}`);
        continue;
      }
      await page
        .waitForFunction(() => (document.body.innerText || '').includes('Thông tin đặt chỗ'), {
          timeout: 45000,
        })
        .catch(() => console.log(`lần ${attempt}: không thấy "Thông tin đặt chỗ"`));
      await new Promise((r) => setTimeout(r, 8000));
      const d = await page.evaluate(PROBE);
      if (d.chains.length) {
        data = d;
        console.log(`lần ${attempt}: OK`);
      }
    } catch (err) {
      console.error(`lần ${attempt} lỗi:`, err.message);
    }
  }

  if (!data) {
    console.log('KHÔNG đo được — site chặn/không render trang.');
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
    console.log(JSON.stringify(data, null, 2).slice(0, 9000));
    console.log(`\nĐã ghi ${OUT}`);
  }
  await browser.close();
})();
