#!/usr/bin/env node
/**
 * Probe tạm: kích hoạt pill "Khứ hồi" trên site thật rồi đo lại thanh đặt vé —
 * để biết bố cục khi chọn khứ hồi (có thêm ô "Ngày về").
 *
 * Ghi: docs/qa/2026-11-13-vietjet-measure/official-booking-bar-roundtrip.json
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
  'official-booking-bar-roundtrip.json'
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
        cls: (el.className || '').toString().slice(0, 30),
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
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
      };
    };
    const out = {};

    // Bấm pill "Khứ hồi" (node đang display:none — dùng JS click).
    const round = Array.from(document.querySelectorAll('button')).find(
      (b) => (b.innerText || '').trim() === 'Khứ hồi'
    );
    if (round) {
      round.scrollIntoView?.();
      round.click();
      await new Promise((r) => setTimeout(r, 2500));
    }
    out.roundClicked = Boolean(round);

    const trip = Array.from(document.querySelectorAll('button')).filter((b) =>
      /^(Một chiều|Khứ hồi|Nhiều chặng)$/.test((b.innerText || '').trim())
    );
    out.trip = trip.map((b) => {
      const r = b.getBoundingClientRect();
      const c = getComputedStyle(b);
      return {
        text: b.innerText.trim(),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: c.display,
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundColor,
      };
    });
    out.tripParent = trip[0] ? info(trip[0].parentElement) : null;

    // Đo lại các ô nhập trong thanh.
    const fields = ['Từ', 'Đến', 'Ngày đi', 'Ngày về', 'Hành khách'];
    out.fields = fields.map((label) => {
      const el = Array.from(document.querySelectorAll('button')).find(
        (b) => (b.innerText || '').replace(/\s+/g, ' ').trim().startsWith(label)
      );
      return { label, info: info(el) };
    });

    const cta = Array.from(document.querySelectorAll('button')).find((b) =>
      /Tìm chuyến bay/i.test(b.innerText || '')
    );
    out.cta = info(cta);
    let panel = cta;
    while (panel && getComputedStyle(panel).backgroundColor !== 'rgba(255, 255, 255, 0.9)') {
      panel = panel.parentElement;
    }
    out.panel = info(panel);
    out.panelKids = Array.from(panel.children).map(info);
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
