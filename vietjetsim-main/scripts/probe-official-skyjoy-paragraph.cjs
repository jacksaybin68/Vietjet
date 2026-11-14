#!/usr/bin/env node
/**
 * Đo các node con TRỰC TIẾP của thẻ <p> chứa dòng "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay"
 * (màu/cỡ chữ/link) để chỉnh `.vj-skyjoy-line` khớp site thật.
 *
 * Chạy: node scripts/probe-official-skyjoy-paragraph.cjs
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
      const out = [];
      const walk = (node) => {
        for (const child of node.childNodes) {
          if (child.nodeType === 3 && /Bạn đã biết/.test(child.textContent || '')) {
            const span = child.parentElement;
            const p = span.parentElement;
            const describe = (el) => {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              return {
                tag: el.tagName,
                cls: (el.className || '').toString().slice(0, 110),
                text: (el.textContent || '').trim().slice(0, 60),
                x: Math.round(r.x),
                y: Math.round(r.y),
                w: Math.round(r.width),
                h: Math.round(r.height),
                display: cs.display,
                fs: cs.fontSize,
                fw: cs.fontWeight,
                lh: cs.lineHeight,
                color: cs.color,
                textDecoration: cs.textDecorationLine,
                cursor: cs.cursor,
              };
            };
            out.push({
              p: describe(p),
              children: [...p.childNodes].map((n) => {
                if (n.nodeType === 3) {
                  const range = document.createRange();
                  range.selectNodeContents(n);
                  const rr = range.getBoundingClientRect();
                  return {
                    type: 'text',
                    text: JSON.stringify(n.textContent),
                    x: Math.round(rr.x),
                    w: Math.round(rr.width),
                  };
                }
                return { type: 'el', ...describe(n) };
              }),
            });
            return;
          } else if (child.nodeType === 1) {
            walk(child);
          }
        }
      };
      walk(document.body);
      return out;
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
