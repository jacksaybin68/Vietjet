#!/usr/bin/env node
/** Kiểm tra lỗi console/runtime của trang chủ local. */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

const BASE = (process.env.MEASURE_BASE_URL || 'http://127.0.0.1:4028').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
  page.on('console', (m) => console.log('[console:' + m.type() + ']', m.text().slice(0, 400)));
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
  await page.setViewport({ width: 1440, height: 900 });
  const res = await page.goto(`${BASE}/trang-chu`, { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('status', res.status());
  await new Promise((r) => setTimeout(r, 2500));
  const state = await page.evaluate(() => ({
    bodyStart: document.body.innerText.slice(0, 300),
    hasMain: !!document.querySelector('main#main-content'),
    railCount: document.querySelectorAll('.vj-booking-rail').length,
    shellCount: document.querySelectorAll('.vj-booking-shell').length,
    nextError: !!document.querySelector('nextjs-portal'),
  }));
  console.log(JSON.stringify(state, null, 2));
  await page.screenshot({ path: '/tmp/local-home.png' });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
