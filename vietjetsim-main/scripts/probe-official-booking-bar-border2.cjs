#!/usr/bin/env node
/**
 * Probe tạm: dải đặt vé site thật — dọn overlay cookie trước rồi chụp lại,
 * và in computed border của hàng tìm kiếm.
 *
 * Cần bằng chứng trực quan cho câu hỏi: hàng tìm kiếm có VIỀN ĐỎ 5px ở
 * trái/phải/dưới hay không (DOM báo có, nhưng ảnh trước bị overlay che).
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';
const OUT = process.argv[3] || '/tmp/official-bar-clean.png';

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

  // Dọn mọi overlay phủ lên dải đặt vé: tìm theo nội dung chữ cookie.
  const cleaned = await page.evaluate(() => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const text = (node.innerText || '').slice(0, 80);
      if (/cookie/i.test(text) && node.children.length < 40) {
        const c = getComputedStyle(node);
        if (
          c.position === 'fixed' ||
          c.position === 'absolute' ||
          node.className === '' ||
          /modal|cookie|overlay/i.test(node.className.toString())
        ) {
          hits.push(node.className.toString().slice(0, 40));
          node.remove();
        }
      }
    }
    // Thêm: ẩn mọi phần tử fixed còn lại che vùng y=823..892.
    document.querySelectorAll('body *').forEach((el) => {
      const c = getComputedStyle(el);
      if (c.position === 'fixed' || c.position === 'sticky') {
        const r = el.getBoundingClientRect();
        if (r.height > 200 && r.top < 900 && r.bottom > 700) el.style.display = 'none';
      }
    });
    return hits;
  });

  const bar = await page.evaluate(() => {
    const cta = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Tìm chuyến bay'
    );
    let el = cta;
    while (el && getComputedStyle(el).backgroundColor !== 'rgba(255, 255, 255, 0.9)') {
      el = el.parentElement;
    }
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      offsetWidth: el.offsetWidth,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
      borderLeft: c.borderLeft,
      borderRight: c.borderRight,
      borderBottom: c.borderBottom,
      borderTop: c.borderTop,
      boxSizing: c.boxSizing,
      radius: c.borderRadius,
    };
  });

  await page.screenshot({ path: OUT, clip: { x: 110, y: 775, width: 1220, height: 130 } });

  // Đọc pixel trực tiếp từ file ảnh vừa chụp (không qua overlay).
  const png = fs.readFileSync(OUT);
  console.log(JSON.stringify({ cleaned, bar, pngBytes: png.length, shot: OUT }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
