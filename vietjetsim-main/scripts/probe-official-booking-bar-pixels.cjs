#!/usr/bin/env node
/**
 * Probe tạm: lấy màu pixel THẬT của dải đặt vé trên site thật để chốt
 * viền đỏ 5px quanh hàng tìm kiếm (DOM báo `border: 5px solid #EC2029`
 * ở trái/phải/dưới — cần xác nhận bằng pixel).
 *
 * Cách làm: chụp ảnh vùng cần đo bằng Puppeteer, rồi nạp ảnh đó vào
 * <canvas> trong chính trang đó để đọc `getImageData`.
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

const SAMPLES = [
  // [x, y, nhãn] — tương đối so với mép trên-trái của hàng tìm kiếm.
  [0, 30, 'viền trái (x=0)'],
  [2, 30, 'viền trái (x=2)'],
  [4, 30, 'viền trái (x=4)'],
  [6, 30, 'sau viền trái (x=6)'],
  [12, 30, 'trong ô Từ (x=12)'],
  [1199, 30, 'viền phải (x=1199)'],
  [1194, 30, 'viền phải (x=1194)'],
  [1190, 30, 'trong ô hành khách'],
  [600, 2, 'trên cùng hàng (y=2)'],
  [600, 66, 'đáy hàng (y=66)'],
  [600, 68, 'dưới đáy hàng (y=68)'],
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  // Ẩn lớp cookie để không che mất dải đặt vé.
  await page.evaluate(() => {
    document
      .querySelectorAll('[class*="cookie"], .custom-modal')
      .forEach((el) => {
        el.style.display = 'none';
      });
  });

  const bar = await page.evaluate(() => {
    const cta = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Tìm chuyến bay'
    );
    if (!cta) return null;
    let el = cta;
    while (el && getComputedStyle(el).backgroundColor !== 'rgba(255, 255, 255, 0.9)') {
      el = el.parentElement;
    }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  if (!bar) throw new Error('Không tìm thấy hàng tìm kiếm');

  const shot = await page.screenshot({
    clip: { x: bar.x, y: bar.y, width: bar.w, height: bar.h },
    encoding: 'base64',
  });

  const colors = await page.evaluate(
    async (b64, samples) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return samples.map(([x, y, label]) => {
        const d = ctx.getImageData(x, y, 1, 1).data;
        return { label, x, y, rgba: `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3] / 255})` };
      });
    },
    shot,
    SAMPLES
  );

  console.log(JSON.stringify({ bar, colors }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
