#!/usr/bin/env node
/**
 * Đo riêng dòng "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay" trên site thật
 * (màu/kích thước phần chữ dẫn) để chỉnh cho khớp.
 *
 * Chạy: node scripts/probe-official-skyjoy-line.cjs
 */
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URLS = [
  'https://newweb.vietjetair.com/vi/checkin',
  'https://newweb.vietjetair.com/vi/my/search-booking',
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const url of URLS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const found = [];
      const walk = (node) => {
        for (const child of node.childNodes) {
          if (child.nodeType === 3) {
            if (child.textContent && child.textContent.includes('Bạn đã biết')) {
              const el = child.parentElement;
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              found.push({
                tag: el.tagName,
                cls: (el.className || '').toString().slice(0, 140),
                text: el.textContent.trim().slice(0, 90),
                x: Math.round(r.x),
                y: Math.round(r.y),
                w: Math.round(r.width),
                h: Math.round(r.height),
                fs: cs.fontSize,
                lh: cs.lineHeight,
                fw: cs.fontWeight,
                ff: cs.fontFamily,
                color: cs.color,
                children: [...el.childNodes].map((n) => {
                  if (n.nodeType !== 1) return { type: 'text', text: n.textContent };
                  const rr = n.getBoundingClientRect();
                  const cc = getComputedStyle(n);
                  return {
                    tag: n.tagName,
                    text: n.textContent.trim().slice(0, 40),
                    x: Math.round(rr.x),
                    w: Math.round(rr.width),
                    fs: cc.fontSize,
                    fw: cc.fontWeight,
                    ff: cc.fontFamily,
                    color: cc.color,
                  };
                }),
              });
            }
          } else if (child.nodeType === 1) {
            walk(child);
          }
        }
      };
      walk(document.body);
      return found;
    });

    console.log(`\n== ${url}`);
    console.log(JSON.stringify(data, null, 1));
    await page.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
