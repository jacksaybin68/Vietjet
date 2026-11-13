#!/usr/bin/env node
/**
 * Đo bổ sung: CTA + tab + panel ở DESKTOP (1440×900) của site thật để bảo đảm
 * các sửa đổi cho mobile không phá vỡ parity desktop đã nghiệm thu.
 */
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://www.vietjetair.com/vi/';

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => require('node:fs').existsSync(p));
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
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    const R = (el) => {
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: c.fontSize,
        borderRadius: c.borderRadius,
        backgroundImage: c.backgroundImage,
        padding: c.padding,
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));
    const byText = (sel, re) => all(sel).find((e) => re.test((e.textContent || '').trim()));
    const res = {};

    const cta = byText('button', /Tìm chuyến bay/i);
    res.cta = cta ? R(cta) : null;

    const tab1 = byText('button', /Mua hành lý/);
    const tab2 = byText('button', /Đổi thưởng/);
    const tab3 = byText('button', /Gửi hàng nhanh/);
    res.tabs = [tab1, tab2, tab3].map((t) => (t ? R(t) : null));

    let p = cta;
    let panel = null;
    while (p) {
      const bg = getComputedStyle(p).backgroundImage;
      if (bg.includes('217, 26, 33')) {
        panel = p;
        break;
      }
      p = p.parentElement;
    }
    if (panel) {
      res.panel = R(panel);
      res.panelRows = Array.from(panel.children).map((r) => ({
        ...R(r),
        children: Array.from(r.children).map((k) => ({
          tag: k.tagName,
          text: (k.textContent || '').trim().slice(0, 24),
          ...R(k),
        })),
      }));
    }

    // Chấm slider
    const li = all('li').find((l) => {
      const r = l.getBoundingClientRect();
      return Math.round(r.width) === 20 && r.top > 300;
    });
    if (li) {
      let n = li;
      for (let i = 0; i < 3 && n; i++) {
        res['dotsChain' + i] = R(n);
        n = n.parentElement;
      }
    }
    return res;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
