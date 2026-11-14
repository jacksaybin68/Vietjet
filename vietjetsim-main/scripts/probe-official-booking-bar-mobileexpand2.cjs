#!/usr/bin/env node
/**
 * Probe tạm: cấu trúc lưới của thẻ đặt vé MOBILE ở trạng thái MỞ RỘNG
 * của site thật — dùng để dựng lại hành vi bung form khi bấm vào ô "Từ".
 */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

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

  await page.evaluate(() => {
    document.querySelectorAll('div,section').forEach((el) => {
      const t = (el.innerText || '').toLowerCase();
      if (t.includes('cookie') && el.getBoundingClientRect().width > 200) el.remove();
    });
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith('Từ')
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  const data = await page.evaluate(() => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 20),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        gridCols: c.gridTemplateColumns,
        gridRows: c.gridTemplateRows,
        gap: c.gap,
        padding: c.padding,
        margin: c.margin,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        position: c.position,
        top: c.top,
        left: c.left,
        right: c.right,
        bottom: c.bottom,
        zIndex: c.zIndex,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        border: c.border,
      };
    };

    // Thẻ trắng (jss293) ở trạng thái mở rộng.
    let card = null;
    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    if (cta) {
      card = cta.parentElement;
      while (card && getComputedStyle(card).backgroundColor !== 'rgb(255, 255, 255)') {
        card = card.parentElement;
      }
    }

    const out = {};
    out.card = info(card);
    if (card) {
      const dump = (el, depth) => {
        if (!el || depth > 4) return null;
        return {
          self: info(el),
          kids: Array.from(el.children).map((c) => dump(c, depth + 1)),
        };
      };
      out.tree = dump(card, 0);
      out.cta = info(cta);
    }

    // Thẻ đỏ bao ngoài + vị trí của nó trong trang.
    const bookTab = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Đặt vé'
    );
    let red = bookTab;
    while (red && getComputedStyle(red).backgroundColor !== 'rgb(236, 32, 41)') {
      red = red.parentElement;
    }
    out.red = info(red);
    let p = red;
    out.redChain = [];
    for (let i = 0; i < 5 && p; i += 1) {
      out.redChain.push(info(p));
      p = p.parentElement;
    }
    return out;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
