#!/usr/bin/env node
/**
 * Probe tạm: tìm nút "Tìm chuyến bay" ĐANG HIỂN THỊ trên trang chủ
 * mobile (390×844) của site thật — để biết CTA nằm ở đâu khi widget
 * đặt vé bị thu gọn (chỉ còn Từ / Đến).
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';

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
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        bg: c.backgroundColor,
        radius: c.borderRadius,
      };
    };
    const out = {};
    out.allCta = Array.from(document.querySelectorAll('button'))
      .filter((b) => /tìm chuyến bay/i.test(b.innerText || ''))
      .map(info);
    out.visibleCta = out.allCta.filter((b) => b.w > 0 && b.h > 0);

    // Khối đỏ chứa rail.
    const bookTab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    let red = bookTab;
    while (red && getComputedStyle(red).backgroundColor !== 'rgb(236, 32, 41)') {
      red = red.parentElement;
    }
    out.red = info(red);
    if (red) {
      // Những phần tử ngay sau khối đỏ trong cùng nhánh cha.
      const parent = red.parentElement;
      out.redSiblings = Array.from(parent ? parent.children : []).map(info);
    }

    // Có thanh điều hướng dưới cùng với nút tìm chuyến bay không?
    out.fixed = Array.from(document.querySelectorAll('div,nav'))
      .filter((el) => getComputedStyle(el).position === 'fixed')
      .map(info)
      .slice(0, 12);
    return out;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
