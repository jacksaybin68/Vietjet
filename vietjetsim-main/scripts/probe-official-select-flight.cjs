#!/usr/bin/env node
/**
 * probe-official-select-flight.cjs — đo trang CHỌN CHUYẾN BAY của site thật
 * (newweb.vietjetair.com/vi/select-flight) ở desktop 1440×900.
 *
 * Ghi JSON số đo vào docs/qa/2026-11-13-vietjet-measure/official-select-flight.json
 * Chỉ ghi SỐ ĐO, không tải asset/CSS/font về repo.
 *
 * Trang này là SPA: dữ liệu chuyến bay chỉ về sau khi có response API nên
 * probe chờ lâu hơn và thử nhiều URL (kèm tham số tìm kiếm) trước khi kết
 * luận là không đo được.
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
  'official-select-flight.json'
);

const BASE = 'https://newweb.vietjetair.com';
const CANDIDATES = [
  `${BASE}/vi/select-flight?departAirport=HAN&arrivalAirport=SGN&departDate=2026-11-20&adult=1&child=0&infant=0`,
  `${BASE}/vi/select-flight`,
  `${BASE}/vi/pages/booking-search?departAirport=HAN&arrivalAirport=SGN&departDate=2026-11-20&adult=1&child=0&infant=0`,
];

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
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      lh: c.lineHeight,
      font: c.fontFamily,
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage.slice(0, 220),
      radius: c.borderRadius,
      border: c.border,
      padding: c.padding,
      shadow: c.boxShadow.slice(0, 140),
    };
  };
  const vis = (e) => e && e.offsetParent !== null;
  const all = (s) => Array.from(document.querySelectorAll(s));
  const byText = (sel, re) => all(sel).find((el) => re.test((el.textContent || '').trim()));

  // 1. H1 trang chọn chuyến bay (băng đỏ trên cột trái).
  const h1 = all('h1').filter(vis).map(box);

  // 2. Ô hạng vé: ô có số tiền + mã tiền tệ bên trong.
  const fareCells = all('div,li,td,button')
    .filter(vis)
    .filter((el) => {
      const t = (el.textContent || '').trim();
      return /VND/.test(t) && t.length < 40 && el.getBoundingClientRect().width > 60;
    })
    .slice(0, 8)
    .map(box);

  // 3. Panel tổng bên phải (aside) + các thanh mục trong đó.
  const aside = box(document.querySelector('aside'));
  const asideBars = aside
    ? Array.from(document.querySelector('aside').children).slice(0, 8).map(box)
    : [];

  // 4. Nút "Đi tiếp".
  const cta = byText('button,a', /đi tiếp/i) ? box(byText('button,a', /đi tiếp/i)) : null;

  // 5. Ô nhập kiểu MUI underline (trang hành khách dùng chung pattern).
  const inputs = all('input').filter(vis).slice(0, 6).map(box);

  // 6. Các tiêu đề trong panel và thẻ chuyến bay.
  const h3 = all('h3').filter(vis).slice(0, 6).map(box);
  const h4 = all('h4').filter(vis).slice(0, 6).map(box);

  // 7. Khối chứa "Hết chỗ".
  const soldOut = byText('div,span,p,button', /hết chỗ/i);

  return {
    url: location.href,
    bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500),
    h1,
    fareCells,
    aside,
    asideBars,
    cta,
    inputs,
    h3,
    h4,
    soldOut: soldOut ? box(soldOut) : null,
    header: box(document.querySelector('header')),
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

  const results = [];
  for (const url of CANDIDATES) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      // SPA render client-side: chờ cho tới khi body có nội dung thật.
      await page
        .waitForFunction(
          () => (document.body.innerText || '').trim().length > 80,
          { timeout: 45000 }
        )
        .catch(() => null);
      await new Promise((r) => setTimeout(r, 8000));
      const data = await page.evaluate(PROBE);
      results.push({ requested: url, ...data });
      console.log(`\n=== ${url} ===`);
      console.log(JSON.stringify(data, null, 2).slice(0, 4000));
      if ((data.bodyText || '').length > 200) break;
    } catch (err) {
      console.error('LỖI', url, err.message);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`\nĐã ghi ${OUT}`);
  await browser.close();
})();
