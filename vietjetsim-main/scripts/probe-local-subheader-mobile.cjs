#!/usr/bin/env node
/**
 * Soi cấu trúc băng đỏ mobile của header trang con trong APP ĐANG CHẠY.
 *
 * Chạy: node scripts/probe-local-subheader-mobile.cjs
 */
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = (process.env.LOCAL_BASE_URL || 'http://127.0.0.1:4044').replace(/\/$/, '');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const url of ['/lam-thu-tuc', '/chuyen-bay-cua-toi']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle2', timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 800));

    const data = await page.evaluate(() => {
      const header = document.querySelector('.vj-subheader');
      const r = header.getBoundingClientRect();
      const cs = getComputedStyle(header);
      const kids = [...header.children].map((el) => {
        const kr = el.getBoundingClientRect();
        const kcs = getComputedStyle(el);
        return {
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 120),
          x: Math.round(kr.x),
          y: Math.round(kr.y),
          w: Math.round(kr.width),
          h: Math.round(kr.height),
          display: kcs.display,
          padding: kcs.padding,
          bg: kcs.backgroundColor,
          bgImage: kcs.backgroundImage.slice(0, 80),
        };
      });
      const h1 = header.querySelector('h1');
      const hr = h1?.getBoundingClientRect();
      return {
        header: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
          display: cs.display,
          position: cs.position,
          padding: cs.padding,
          borderBottom: cs.borderBottom,
          borderRadius: cs.borderRadius,
          boxShadow: cs.boxShadow,
        },
        kids,
        h1: hr
          ? {
              x: Math.round(hr.x),
              y: Math.round(hr.y),
              w: Math.round(hr.width),
              h: Math.round(hr.height),
              text: h1.innerText,
            }
          : null,
        imgs: header.querySelectorAll('img').length,
        buttons: [...header.querySelectorAll('button')].map((b) => {
          const br = b.getBoundingClientRect();
          return { x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height) };
        }),
      };
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
