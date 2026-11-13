#!/usr/bin/env node
/**
 * Đo CHI TIẾT dải đặt vé ngang (desktop 1440×900) của site thật.
 *
 * Bổ sung cho `probe-official-booking-bar-desktop.cjs`: script đó chỉ ra khung
 * (chain) và rail, nhưng các ô nhập trên site là MUI (không phải `<input>`
 * gốc cho mọi trường), nên cần dò theo NỘI DUNG chữ để lấy đúng hộp.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-fields.json
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
  'official-booking-bar-fields.json'
);
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 40),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        fs: c.fontSize,
        fw: c.fontWeight,
        lh: c.lineHeight,
        color: c.color,
        bg: c.backgroundColor,
        bgImage: c.backgroundImage.slice(0, 110),
        radius: c.borderRadius,
        padding: c.padding,
        border: c.border,
        borderBottom: c.borderBottom,
        borderTop: c.borderTop,
        borderLeft: c.borderLeft,
        borderRight: c.borderRight,
        shadow: c.boxShadow.slice(0, 70),
        gap: c.gap,
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));

    // Khung thanh đặt vé: cha của nút "Tìm chuyến bay", 4 cấp lên.
    const cta = all('button').find((b) => /Tìm chuyến bay/i.test(b.innerText || ''));
    let bar = cta;
    for (let i = 0; i < 4 && bar; i++) bar = bar.parentElement;

    const out = { route: 'home', viewport: 'desktop-1440', url: location.href };
    out.bar = info(bar);

    // Dò mọi phần tử có nằm trong vùng thanh (y 780..900) để biết ô nào ở đâu.
    const inBar = (el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 770 && r.bottom <= 900 && r.width > 0 && r.height > 0;
    };

    out.barChildren = all('div,button,label,span,p,a').filter(inBar).map(info);

    // Ảnh chụp nhỏ: text của từng nút/ô trong thanh.
    out.barButtons = all('button').filter(inBar).map(info);

    // Radio/switch thật (MUI dùng input[type=radio] ẩn + span).
    out.radioInputs = all('input').map((i) => {
      const r = i.getBoundingClientRect();
      return {
        type: i.getAttribute('type'),
        checked: i.checked,
        name: i.name,
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    });

    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log('ghi', OUT);
  console.log(JSON.stringify(data.bar, null, 2));
  console.log('--- barButtons ---');
  for (const b of data.barButtons) {
    console.log(
      `${b.tag} x=${b.x} y=${b.y} w=${b.w} h=${b.h} fs=${b.fs} fw=${b.fw} ${JSON.stringify(b.text)}`
    );
  }
  console.log('--- radioInputs ---');
  for (const r of data.radioInputs) console.log(JSON.stringify(r));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
