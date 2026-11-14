#!/usr/bin/env node
/**
 * Probe tạm: trạng thái MỞ RỘNG của dải đặt vé trên mobile (390×844) của site
 * thật — bấm vào thẻ đỏ để bung form ra, rồi đo vị trí nút "Tìm chuyến bay".
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

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  const info = (el) => {
    if (!el) return null;
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 40),
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: c.display,
      bg: c.backgroundColor,
      radius: c.borderRadius,
      padding: c.padding,
    };
  };

  const before = await page.evaluate(() => {
    const out = {};
    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    out.cta = cta ? cta.getBoundingClientRect().width : null;
    return out;
  });

  // Bấm vào ô "Từ" để bung form ra (nút sân bay trong thẻ trắng).
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith('Từ')
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2500));

  const after = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 40),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        padding: c.padding,
      };
    };
    const out = {};
    const cta = Array.from(document.querySelectorAll('button')).find(
      (b) => /Tìm chuyến bay/i.test(b.innerText || '') && b.getBoundingClientRect().width > 0
    );
    out.cta = info(cta);
    out.ctaParent = info(cta && cta.parentElement);

    const bookTab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    let red = bookTab;
    while (red && getComputedStyle(red).backgroundColor !== 'rgb(236, 32, 41)') {
      red = red.parentElement;
    }
    out.red = info(red);
    out.redKids = red ? Array.from(red.children).map(info) : [];

    const labels = ['Ngày đi', 'Hành khách'];
    out.fields = labels.map((label) => {
      const el = Array.from(document.querySelectorAll('button')).find(
        (b) =>
          (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith(label) &&
          b.getBoundingClientRect().width > 0
      );
      return { label, info: info(el) };
    });
    return out;
  });

  console.log(JSON.stringify({ before, after }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
