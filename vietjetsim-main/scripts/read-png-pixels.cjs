#!/usr/bin/env node
/**
 * Đọc pixel từ ảnh PNG đã chụp (file://) bằng canvas trong Chrome, để kiểm
 * chắc viền đỏ 5px quanh hàng tìm kiếm của site thật có thật không.
 *
 * Ảnh nguồn: /tmp/official-bar-clean.png (clip x=110..1330, y=775..905).
 * Hàng tìm kiếm bắt đầu ở x=120 → trong ảnh là cột 10.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILE = process.argv[2] || '/tmp/official-bar-clean.png';

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
  await page.goto('about:blank');

  const b64 = fs.readFileSync(FILE).toString('base64');
  const out = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const at = (x, y) => {
      const d = ctx.getImageData(x, y, 1, 1).data;
      return `${d[0]},${d[1]},${d[2]}`;
    };
    // Mép trái của hàng tìm kiếm nằm ở cột 10 trong ảnh (clip từ x=110).
    const left = [];
    for (let x = 8; x < 24; x += 1) left.push(`${x}:${at(x, 60)}`);
    const right = [];
    for (let x = 1204; x <= 1219; x += 1) right.push(`${x}:${at(x, 60)}`);
    const bottom = [];
    for (let y = 115; y < 130; y += 1) bottom.push(`${y}:${at(610, y)}`);
    const top = [];
    for (let y = 45; y < 56; y += 1) top.push(`${y}:${at(610, y)}`);
    return { size: [img.width, img.height], left, right, bottom, top };
  }, b64);

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('lỗi:', e);
  process.exit(1);
});
