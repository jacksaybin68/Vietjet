#!/usr/bin/env node
/**
 * Đo chi tiết các node con của dòng "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay"
 * (màu, cỡ chữ, khoảng cách) để chỉnh `.vj-skyjoy-line` khớp site thật.
 *
 * Chạy: node scripts/probe-official-skyjoy-nodes.cjs
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
            const p = child.parentElement;
            const r = p.getBoundingClientRect();
            const cs = getComputedStyle(p);
            out.push({
              p: {
                tag: p.tagName,
                x: Math.round(r.x),
                y: Math.round(r.y),
                w: Math.round(r.width),
                h: Math.round(r.height),
                fs: cs.fontSize,
                fw: cs.fontWeight,
                lh: cs.lineHeight,
                color: cs.color,
                margin: cs.margin,
                textAlign: cs.textAlign,
                display: cs.display,
              },
              nodes: [...p.childNodes].map((n) => {
                if (n.nodeType === 3) {
                  const range = document.createRange();
                  range.selectNodeContents(n);
                  const rr = range.getBoundingClientRect();
                  return {
                    type: 'text',
                    text: n.textContent,
                    x: Math.round(rr.x),
                    w: Math.round(rr.width),
                    h: Math.round(rr.height),
                  };
                }
                const rr = n.getBoundingClientRect();
                const cc = getComputedStyle(n);
                return {
                  type: 'el',
                  tag: n.tagName,
                  cls: (n.className || '').toString().slice(0, 100),
                  text: n.textContent,
                  x: Math.round(rr.x),
                  y: Math.round(rr.y),
                  w: Math.round(rr.width),
                  h: Math.round(rr.height),
                  fs: cc.fontSize,
                  fw: cc.fontWeight,
                  lh: cc.lineHeight,
                  color: cc.color,
                  display: cc.display,
                  textDecoration: cc.textDecorationLine,
                };
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
