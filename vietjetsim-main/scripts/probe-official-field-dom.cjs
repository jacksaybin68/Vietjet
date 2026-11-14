#!/usr/bin/env node
/**
 * Soi cấu trúc DOM + style của MỘT ô nhập tra cứu trên site thật
 * (bao gồm mọi phần tử chứa chữ "Mã đặt chỗ").
 *
 * Chạy: node scripts/probe-official-field-dom.cjs
 */
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URLS = [
  'https://newweb.vietjetair.com/vi/checkin',
  'https://newweb.vietjetair.com/vi/my/search-booking',
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const url of URLS) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 500 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90_000 });
      await new Promise((r) => setTimeout(r, 1500));

      const data = await page.evaluate(() => {
        const input = document.querySelector('input[name="reservationLocator"]');
        if (!input) return null;
        const fieldset = input.closest('fieldset');
        const formControl = input.closest('[class*="MuiFormControl"]');
        const nodes = [];
        const describe = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 120),
            text: (el.textContent || '').trim().slice(0, 40),
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            fs: cs.fontSize,
            lh: cs.lineHeight,
            fw: cs.fontWeight,
            color: cs.color,
            transform: cs.transform,
            opacity: cs.opacity,
            visibility: cs.visibility,
            position: cs.position,
            padding: cs.padding,
            margin: cs.margin,
            borderBottom: cs.borderBottom,
            background: cs.backgroundColor,
            zIndex: cs.zIndex,
          };
        };
        nodes.push(describe(formControl));
        nodes.push(describe(fieldset));
        nodes.push(describe(input));
        // label
        nodes.push(describe(input.closest('[class*="MuiFormControl"]')?.querySelector('label')));
        // mọi span/legend chứa chữ
        const all = [...document.querySelectorAll('label, legend, span, p, div')].filter(
          (el) => el.children.length === 0 && /Mã đặt chỗ/i.test(el.textContent || '')
        );
        const texts = all.slice(0, 4).map(describe);
        // kiểm tra phần tử cha trực tiếp của input
        const parentChain = [];
        let cur = input;
        for (let i = 0; i < 4 && cur; i += 1) {
          parentChain.push(describe(cur));
          cur = cur.parentElement;
        }
        return { nodes, texts, parentChain };
      });

      console.log(`\n== ${url} @ ${vp.name}`);
      console.log(JSON.stringify(data, null, 1));
      await page.close();
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
