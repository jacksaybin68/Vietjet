#!/usr/bin/env node
/**
 * Đo HERO BOOKING BAR ngang trên DESKTOP (1440×900) của site thật.
 *
 * Site mới (`newweb.vietjetair.com`) đã đổi dải đặt vé từ khối dọc 380px
 * (3 tab dịch vụ + panel 410px) sang THANH NGANG 1200px:
 *   - rail 4 dịch vụ (Đặt vé / Khách sạn / Skyshop / Đổi thưởng vé máy bay)
 *   - form tìm kiếm 1 hàng ngang
 *   - nút CTA 174×44px gradient vàng
 *
 * Script này ghi SỐ ĐO (không tải asset/CSS/font) vào
 * docs/qa/2026-11-13-vietjet-measure/official-booking-bar-desktop-1440.json
 *
 * Dùng: node scripts/probe-official-booking-bar-desktop.cjs [url]
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
  'official-booking-bar-desktop-1440.json'
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
  if (!found) throw new Error('Không tìm thấm Chrome/Chromium');
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
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60),
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
        shadow: c.boxShadow.slice(0, 70),
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));
    const byText = (sel, text) =>
      all(sel).find((el) => (el.innerText || '').trim().replace(/\s+/g, ' ') === text);
    const byRe = (sel, re) => all(sel).find((el) => re.test((el.innerText || '').trim()));

    const out = { route: 'home', viewport: 'desktop-1440', url: location.href };

    // ── Nút CTA ──────────────────────────────────────────────────────────
    const cta = byRe('button', /Tìm chuyến bay/i);
    out.cta = info(cta);

    // ── Rail dịch vụ: 4 nút ─────────────────────────────────────────────
    const railLabels = ['Đặt vé', 'Khách sạn', 'Skyshop', 'Đổi thưởng vé máy bay'];
    out.rail = railLabels.map((label) => {
      const el = byText('button', label) || byRe('button, a, div', new RegExp(`^${label}$`));
      return { label, ...(info(el) || {}) };
    });

    // ── Chuỗi cha của CTA để dựng khung chứa cả thanh ──────────────────
    const chain = [];
    let node = cta;
    for (let i = 0; i < 9 && node; i++) {
      chain.push(info(node));
      node = node.parentElement;
    }
    out.ctaChain = chain;

    // ── Ô nhập trong thanh ──────────────────────────────────────────────
    const inputs = all('input').filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 40 && r.height > 10 && r.top < 900;
    });
    out.inputs = inputs.slice(0, 12).map((i) => ({
      ...info(i),
      placeholder: i.getAttribute('placeholder'),
      type: i.getAttribute('type'),
    }));

    // ── Nhãn của các ô (div/span/label chứa chữ) ──────────────────────
    out.labels = all('label, div, span')
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const txt = (el.innerText || '').trim();
        return r.width > 30 && r.height > 10 && r.height < 60 && r.top < 900 && txt.length < 40;
      })
      .slice(0, 40)
      .map((el) => info(el));

    // ── Radio / switch ──────────────────────────────────────────────────
    out.radios = all('input[type="radio"]').map((i) => info(i));

    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
