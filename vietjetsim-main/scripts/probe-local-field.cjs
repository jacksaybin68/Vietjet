#!/usr/bin/env node
/** Đo chi tiết ô "Từ" của app LOCAL. */
const puppeteer = require('puppeteer-core');
const BASE = (process.env.MEASURE_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 5000));

  const data = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Điểm khởi hành"]');
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
        cls: (node.className || '').toString().slice(0, 45),
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
