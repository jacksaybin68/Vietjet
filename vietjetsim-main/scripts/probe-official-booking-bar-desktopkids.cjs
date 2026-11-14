#!/usr/bin/env node
/**
 * Probe tạm (desktop): cấu trúc con trực tiếp của khung trắng thanh đặt vé
 * và nội dung popover lịch — để biết dải pill "Một chiều / Khứ hồi /
 * Nhiều chặng" hiện ở đâu trên site thật.
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-desktopkids.json
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
  'official-booking-bar-desktopkids.json'
);
const URL_OFFICIAL = process.argv[2] || 'https://newweb.vietjetair.com/vi/';
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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_OFFICIAL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 9000));

  const data = await page.evaluate(async () => {
    const info = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 44),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundColor,
        radius: c.borderRadius,
        padding: c.padding,
        gap: c.gap,
        flex: c.flex,
        justify: c.justifyContent,
        align: c.alignItems,
        border: c.border,
        shadow: c.boxShadow.slice(0, 60),
      };
    };
    const out = {};

    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    let panel = cta;
    while (panel && getComputedStyle(panel).backgroundColor !== 'rgba(255, 255, 255, 0.9)') {
      panel = panel.parentElement;
    }
    out.panel = info(panel);
    out.panelKids = Array.from(panel.children).map(info);
    // 2 cấp con
    out.panelGrandKids = Array.from(panel.children).map((c) =>
      Array.from(c.children).map(info)
    );

    // Rail đỏ: con trực tiếp
    let rail = cta;
    while (rail && getComputedStyle(rail).backgroundColor !== 'rgb(236, 32, 41)') {
      rail = rail.parentElement;
    }
    out.rail = info(rail);
    out.railKids = Array.from(rail.children).map(info);
    out.railGrandKids = Array.from(rail.children).map((c) =>
      Array.from(c.children).map(info)
    );

    // Mở popover lịch để xem có pill loại hành trình bên trong không.
    const dateBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith('Ngày đi')
    );
    if (dateBtn) {
      dateBtn.click();
      await new Promise((r) => setTimeout(r, 2500));
    }
    const tripVisible = Array.from(document.querySelectorAll('button')).filter((b) => {
      if (!/^(Một chiều|Khứ hồi|Nhiều chặng)$/.test((b.innerText || '').trim())) return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    out.tripVisibleAfterDateClick = tripVisible.map(info);
    out.tripParents = tripVisible.map((b) => {
      const chain = [];
      let n = b.parentElement;
      for (let i = 0; i < 5 && n; i += 1) {
        chain.push(info(n));
        n = n.parentElement;
      }
      return chain;
    });
    return out;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})().catch((e) => {
  console.error('probe lỗi:', e);
  process.exit(1);
});
