#!/usr/bin/env node
/**
 * probe-official-net.cjs — bắt các request XHR của site thật khi mở trang
 * chọn chuyến bay, để biết đúng tham số query/API mà site dùng (probe tĩnh
 * trước đó không ra danh sách chuyến vì thiếu tham số).
 *
 * Ghi log vào docs/qa/2026-11-13-vietjet-measure/official-net.json
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const OUT = path.resolve(
  __dirname,
  '..',
  'docs',
  'qa',
  '2026-11-13-vietjet-measure',
  'official-net.json'
);

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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const requests = [];
  page.on('request', (req) => {
    const u = req.url();
    if (!/newweb\.vietjetair\.com/.test(u)) return;
    if (/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|ico|gif|webp)(\?|$)/i.test(u)) return;
    requests.push({ method: req.method(), url: u.slice(0, 400) });
  });

  const url =
    process.argv[2] ||
    'https://newweb.vietjetair.com/vi/select-flight?departAirport=HAN&arrivalAirport=SGN&departDate=2026-11-20&adult=1&child=0&infant=0';

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 25000));

  const storage = await page.evaluate(() => ({
    href: location.href,
    ls: Object.fromEntries(
      Object.keys(localStorage).map((k) => [k, (localStorage.getItem(k) || '').slice(0, 600)])
    ),
    ss: Object.fromEntries(
      Object.keys(sessionStorage).map((k) => [k, (sessionStorage.getItem(k) || '').slice(0, 600)])
    ),
  }));

  const out = { url, storage, requests };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.log('URL:', storage.href);
  console.log('\n--- localStorage keys ---');
  Object.entries(storage.ls).forEach(([k, v]) => console.log(k, '=', v));
  console.log('\n--- sessionStorage keys ---');
  Object.entries(storage.ss).forEach(([k, v]) => console.log(k, '=', v));
  console.log('\n--- requests (không phải asset) ---');
  requests.forEach((r) => console.log(r.method, r.url));

  await browser.close();
})();
