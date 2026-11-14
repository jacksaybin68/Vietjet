#!/usr/bin/env node
/**
 * Đo sâu dòng "Bạn đã biết về Vietjet SkyJoy? Đăng ký ngay": chuỗi phần tử cha,
 * vị trí link "Đăng ký ngay", và cỡ chữ/màu từng phần — để chỉnh app cho khớp.
 *
 * Chạy: node scripts/probe-official-skyjoy-chain.cjs
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
      let host = null;
      const walk = (node) => {
        if (host) return;
        for (const child of node.childNodes) {
          if (child.nodeType === 3 && /Bạn đã biết/.test(child.textContent || '')) {
            host = child.parentElement;
            return;
          } else if (child.nodeType === 1) {
            walk(child);
          }
        }
      };
      walk(document.body);
      if (!host) return { error: 'not found' };

      const chain = [];
      let node = host;
      for (let i = 0; i < 6 && node; i += 1) {
        const r = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        chain.push({
          tag: node.tagName,
          cls: (node.className || '').toString().slice(0, 120),
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          display: cs.display,
          gap: cs.gap,
          align: cs.alignItems,
          justify: cs.justifyContent,
          fs: cs.fontSize,
          fw: cs.fontWeight,
          lh: cs.lineHeight,
          color: cs.color,
          ff: cs.fontFamily.slice(0, 60),
          text: (node.innerText || '').trim().slice(0, 90),
        });
        node = node.parentElement;
      }

      const links = [...document.querySelectorAll('a')]
        .filter((a) => /Đăng ký ngay/.test(a.innerText || ''))
        .map((a) => {
          const r = a.getBoundingClientRect();
          const cs = getComputedStyle(a);
          return {
            text: a.innerText.trim(),
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            fs: cs.fontSize,
            fw: cs.fontWeight,
            lh: cs.lineHeight,
            color: cs.color,
            ff: cs.fontFamily.slice(0, 60),
          };
        });

      return { chain, links };
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
