#!/usr/bin/env node
/**
 * Probe tạm: cấu trúc bên trong một tab trên rail MOBILE của site thật
 * (kích thước icon, khoảng cách, chữ) — để khớp 4px lệch bề rộng nút.
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

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
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto('https://newweb.vietjetair.com/vi/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(() => {
    document
      .querySelectorAll('div,section')
      .forEach((el) => {
        const t = (el.innerText || '').toLowerCase();
        if (t.includes('cookie') && el.getBoundingClientRect().width > 200) el.remove();
      });

    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 24),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30),
        x: Math.round(r.x),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: c.fontSize,
        fw: c.fontWeight,
        ff: c.fontFamily.split(',')[0],
        ls: c.letterSpacing,
        padding: c.padding,
        gap: c.gap,
      };
    };

    const tab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    const out = { tab: info(tab) };
    out.tabKids = Array.from(tab.children).map((c) => ({
      self: info(c),
      kids: Array.from(c.children).map(info),
    }));
    // Tab thứ hai để thấy khác biệt.
    const tab2 = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Khách sạn'
    );
    out.tab2 = info(tab2);
    out.tab2Kids = Array.from(tab2.children).map((c) => ({
      self: info(c),
      kids: Array.from(c.children).map(info),
    }));
    return out;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
