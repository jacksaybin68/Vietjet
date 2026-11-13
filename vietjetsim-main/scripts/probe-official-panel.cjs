#!/usr/bin/env node
/**
 * probe-official-panel.cjs — đo RIÊNG panel "THÔNG TIN ĐẶT CHỖ" bên phải và
 * thanh tổng tiền của site thật (newweb.vietjetair.com/vi/select-flight),
 * desktop 1440×900.
 *
 * Mục tiêu: xác nhận màu nền / màu chữ của dòng "Tổng tiền" trong panel và
 * màu của giá trong từng mục (Giá vé / Thuế, phí / Dịch vụ) — đối chiếu với
 * `BookingSummaryPanel.tsx` của dự án.
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
  'official-panel.json'
);

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
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage.slice(0, 160),
      radius: c.borderRadius,
      padding: c.padding,
      display: c.display,
    };
  };
  const all = (s) => Array.from(document.querySelectorAll(s));
  const byText = (sel, re) => all(sel).find((el) => re.test((el.textContent || '').trim()));

  // Cây phần tử của panel: từ h3 "Thông tin đặt chỗ" đi lên tới gốc cột.
  const h3 = byText('h3', /thông tin đặt chỗ/i);
  let column = h3;
  for (let i = 0; i < 6 && column; i++) {
    const r = column.getBoundingClientRect();
    if (r.width > 300 && r.width < 420) break;
    column = column.parentElement;
  }
  const columnBox = box(column);

  // Mọi phần tử có nền đỏ/gradient trong cột phải.
  const redBlocks = column
    ? Array.from(column.querySelectorAll('*'))
        .filter((el) => {
          const c = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return (
            (c.backgroundColor === 'rgb(236, 32, 41)' ||
              c.backgroundColor === 'rgb(255, 255, 255)' ||
              /gradient/.test(c.backgroundImage)) &&
            r.width > 100 &&
            r.height > 15
          );
        })
        .map(box)
        .slice(0, 14)
    : [];

  // Dòng "Tổng tiền" trong panel: tìm phần tử chứa đúng chuỗi.
  const totals = all('div,span,p,h3,h4')
    .filter((el) => /^tổng tiền$/i.test((el.textContent || '').trim()))
    .map((el) => {
      // Đi lên tới khối có nền để biết màu nền thật của dòng tổng.
      let bgOwner = el;
      for (let i = 0; i < 5 && bgOwner; i++) {
        const c = getComputedStyle(bgOwner);
        if (c.backgroundColor !== 'rgba(0, 0, 0, 0)' || /gradient/.test(c.backgroundImage)) break;
        bgOwner = bgOwner.parentElement;
      }
      // Chuỗi tổ tiên của dòng tổng — nơi nền đỏ/gradient thực sự xuất hiện.
      const chain = [];
      let n = el;
      for (let i = 0; i < 6 && n; i++) {
        const c = getComputedStyle(n);
        const r = n.getBoundingClientRect();
        chain.push({
          tag: n.tagName,
          x: Math.round(r.x),
          y: Math.round(r.y + window.scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
          bg: c.backgroundColor,
          bgImage: c.backgroundImage.slice(0, 120),
          color: c.color,
          fs: c.fontSize,
          fw: c.fontWeight,
        });
        n = n.parentElement;
      }
      return { self: box(el), bgOwner: box(bgOwner), chain };
    });

  // Thanh đáy cố định (chứa Tổng tiền + Chi tiết + Đi tiếp).
  const cta = byText('button,a', /^đi tiếp$/i);
  let bottom = cta;
  for (let i = 0; i < 5 && bottom; i++) {
    const r = bottom.getBoundingClientRect();
    if (r.width > 900) break;
    bottom = bottom.parentElement;
  }
  const bottomBar = box(bottom);
  const bottomTotals = bottom
    ? Array.from(bottom.querySelectorAll('div,span,p,h4'))
        .filter((el) => /^(tổng tiền|chi tiết|0 vnd)$/i.test((el.textContent || '').trim()))
        .map(box)
    : [];

  return {
    url: location.href,
    column: columnBox,
    redBlocks,
    totals,
    bottomBar,
    bottomTotals,
    cta: cta ? box(cta) : null,
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

  const url =
    process.argv[2] ||
    'https://newweb.vietjetair.com/vi/select-flight?departAirport=HAN&arrivalAirport=SGN&departDate=2026-11-20&adult=1&child=0&infant=0';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // Site có thể redirect về trang chủ; quay lại route select-flight nếu cần.
  await new Promise((r) => setTimeout(r, 4000));
  if (!/select-flight/i.test(page.url())) {
    console.log('bị redirect về', page.url(), '→ thử lại select-flight');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  await page
    .waitForFunction(() => (document.body.innerText || '').includes('Thông tin đặt chỗ'), {
      timeout: 60000,
    })
    .catch(() => console.log('không thấy "Thông tin đặt chỗ"'));
  await new Promise((r) => setTimeout(r, 12000));

  const data = await page.evaluate(PROBE);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2).slice(0, 9000));
  console.log(`\nĐã ghi ${OUT}`);
  await browser.close();
})();
