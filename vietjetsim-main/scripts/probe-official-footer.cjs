#!/usr/bin/env node
/**
 * Dò vùng footer của site thật: site thật KHÔNG dùng thẻ `<footer>` mà là
 * một chuỗi `<div>`, nên cần lần ngược từ nội dung đặc trưng ("Kết nối với
 * Vietjet") để tìm khối nền thật sự.
 *
 * Dùng: node scripts/probe-official-footer.cjs [url]
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://www.vietjetair.com/vi/';

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
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 90),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: c.fontSize,
        fontWeight: c.fontWeight,
        fontFamily: c.fontFamily.split(',')[0],
        color: c.color,
        bg: c.backgroundColor,
        bgImage: c.backgroundImage.slice(0, 120),
        padding: c.padding,
        radius: c.borderRadius,
      };
    };

    const anchor = Array.from(document.querySelectorAll('*')).find(
      (e) =>
        e.children.length === 0 && (e.textContent || '').trim().startsWith('Kết nối với Vietjet')
    );
    const chain = [];
    let p = anchor;
    for (let i = 0; i < 10 && p; i++) {
      chain.push(box(p));
      p = p.parentElement;
    }

    // Tiêu đề cột trong footer: "Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa..."
    const head = Array.from(document.querySelectorAll('*')).find(
      (e) =>
        e.children.length === 0 &&
        (e.textContent || '').trim().startsWith('Mua hành lý, suất ăn, chọn chỗ ngồi')
    );
    const headChain = [];
    p = head;
    for (let i = 0; i < 3 && p; i++) {
      headChain.push(box(p));
      p = p.parentElement;
    }

    // Liên kết đầu tiên trong footer
    const link = Array.from(document.querySelectorAll('a')).find((a) =>
      (a.textContent || '').trim().startsWith('Mua trước hành lý')
    );

    return JSON.stringify(
      { chain, headChain, link: box(link), docHeight: document.body.scrollHeight },
      null,
      1
    );
  });

  console.log(data);
  fs.writeFileSync('/tmp/official-footer.json', data);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
