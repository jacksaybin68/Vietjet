#!/usr/bin/env node
/**
 * Đo vùng đặt vé của site thật ở MOBILE (390×844) — dải tab dịch vụ + thanh
 * tìm chuyến bay ngang.
 *
 * Script này bổ sung cho `scripts/probe-official-desktop-extra.cjs`: bản desktop
 * đo được dải tab 4 nút (Đặt vé / Khách sạn / Skyshop / Đổi thưởng vé máy bay)
 * và thanh tìm kiếm ngang 1200px, còn bản mobile trước đây chỉ đo được hero
 * ảnh. Cần số đo mobile để dựng lại widget ở breakpoint nhỏ.
 *
 * Dùng: node scripts/probe-official-booking-bar-mobile.cjs [url]
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';

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
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 8000));

  const data = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        cls: (el.className || '').toString().slice(0, 26),
        tag: el.tagName,
        txt: (el.innerText || '').trim().replace(/\n/g, '|').slice(0, 40),
        display: c.display,
        fs: c.fontSize,
        fw: c.fontWeight,
        lh: c.lineHeight,
        color: c.color,
        bg: c.backgroundColor,
        bgImage: c.backgroundImage.slice(0, 80),
        radius: c.borderRadius,
        padding: c.padding,
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        shadow: c.boxShadow.slice(0, 60),
        border: c.border,
      };
    };
    const byText = (sel, text) =>
      Array.from(document.querySelectorAll(sel)).find((el) => (el.innerText || '').trim() === text);

    const out = { viewport: { w: innerWidth, h: innerHeight } };

    const cta = byText('button', 'Tìm chuyến bay');
    out.cta = info(cta);

    // Chuỗi cha của CTA để tìm khung chứa toàn bộ dải đặt vé.
    const chain = [];
    let node = cta;
    for (let i = 0; i < 7 && node; i++) {
      chain.push(info(node));
      node = node.parentElement;
    }
    out.ctaChain = chain;

    // Dải tab dịch vụ (nếu mobile còn hiện).
    const serviceTab = byText('button', 'Đặt vé');
    out.serviceTab = info(serviceTab);
    out.serviceTabs = Array.from(document.querySelectorAll('button'))
      .filter((b) =>
        ['Đặt vé', 'Khách sạn', 'Skyshop', 'Đổi thưởng vé máy bay'].includes(
          (b.innerText || '').trim()
        )
      )
      .map(info);

    // Ô nhập sân bay / ngày / hành khách.
    const from = byText('button', 'Điểm khởi hành');
    out.from = info(from);
    if (from) {
      let p = from.parentElement;
      out.fromRow = info(p);
      out.fromRowKids = Array.from(p.children).map(info);
    }

    return out;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
