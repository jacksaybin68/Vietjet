#!/usr/bin/env node
/** Tìm phần tử chứa giá trị "Điểm khởi hành" trong ô Từ của site thật. */
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
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
    const el = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.textContent || '').replace(/\s+/g, ' ').trim().startsWith('Từ')
    );
    if (!el) return null;
    const out = [];
    const walk = (node, depth) => {
      const c = getComputedStyle(node);
      out.push({
        depth,
        tag: node.tagName,
        text: (node.textContent || '').trim().slice(0, 25),
        fs: c.fontSize,
        fw: c.fontWeight,
        ff: c.fontFamily.split(',')[0],
        cls: (node.className || '').toString().slice(0, 40),
      });
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 1) walk(ch, depth + 1);
      });
    };
    walk(el, 0);
    return out;
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
