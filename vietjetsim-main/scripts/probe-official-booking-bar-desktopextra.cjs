#!/usr/bin/env node
/**
 * Probe tạm: khối dải đặt vé DESKTOP của site thật — liệt có hàng phụ
 * (mã khuyến mại / tìm vé rẻ nhất) nằm dưới hàng tìm kiếm không, và
 * chiều cao tổng của khối đặt vé là bao nhiêu.
 */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

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
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('https://newweb.vietjetair.com/vi/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(() => {
    document
      .querySelectorAll('div,section')
      .forEach((el) => {
        const t = (el.innerText || '').toLowerCase();
        if (t.includes('cookie') && el.getBoundingClientRect().width > 200) el.remove();
      });

    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 24),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        padding: c.padding,
      };
    };

    const out = {};

    // Hàng tìm kiếm = khối có viền đỏ 5px ở đáy.
    const bar = Array.from(document.querySelectorAll('div')).find((d) => {
      const c = getComputedStyle(d);
      return c.borderBottomWidth === '5px' && c.borderBottomColor === 'rgb(236, 32, 41)';
    });
    out.bar = info(bar);

    if (bar) {
      // Các anh em ngay sau hàng tìm kiếm (có thể là hàng phụ).
      const after = [];
      let node = bar;
      for (let i = 0; i < 6 && node; i += 1) {
        node = node.nextElementSibling;
        if (node) after.push(info(node));
      }
      out.afterBar = after;

      // Khối bao ngoài cả rail + hàng tìm kiếm.
      let block = bar.parentElement;
      for (let i = 0; i < 4 && block; i += 1) {
        out['parent' + i] = info(block);
        block = block.parentElement;
      }
    }

    // Chuỗi "Mã khuyến mại" / "tìm vé rẻ nhất" trên trang.
    out.promo = Array.from(document.querySelectorAll('*'))
      .filter((el) => {
        const t = (el.innerText || '').trim();
        return el.children.length === 0 && /khuyến mại|vé rẻ nhất|tìm vé rẻ/i.test(t) && t.length < 60;
      })
      .map(info);

    return out;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
