#!/usr/bin/env node
/** Đo chi tiết app ở mobile 390×844 (dùng để đối chiếu với site thật). */
const puppeteer = require('puppeteer-core');

const BASE = process.env.SIM_URL || 'http://127.0.0.1:4028';

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
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/trang-chu`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise((r) => setTimeout(r, 5000));

  const out = await page.evaluate(() => {
    const R = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const c = getComputedStyle(e);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fs: c.fontSize,
        fw: c.fontWeight,
        color: c.color,
        bg: c.backgroundImage.slice(0, 70),
        br: c.borderRadius,
        pad: c.padding,
      };
    };
    const res = { viewport: { w: innerWidth, h: innerHeight } };

    // Header mobile
    const header = document.querySelector('header');
    res.header = header ? R(header) : null;
    res.headerKids = header
      ? Array.from(header.children).map((c) => ({
          tag: c.tagName,
          cls: (c.className || '').toString().slice(0, 60),
          box: R(c),
          kids: Array.from(c.children).map((k) => ({
            tag: k.tagName,
            txt: (k.textContent || '').trim().slice(0, 22),
            box: R(k),
          })),
        }))
      : null;

    // Hero: ảnh + chấm
    const banner = document.querySelector('section > div');
    res.banner = banner ? R(banner) : null;
    const dots = document.querySelector('[data-testid="hero-slider-dots"]');
    res.dots = dots ? { box: R(dots), count: dots.children.length } : null;

    // Tabs
    const tabNav = document.querySelector('.vj-booking-tabs');
    res.tabs = tabNav
      ? Array.from(tabNav.children).map((t) => ({
          txt: (t.textContent || '').trim().slice(0, 24),
          ...R(t),
        }))
      : null;

    // Panel + các hàng
    const panel = document.querySelector('.vj-booking-panel');
    if (panel) {
      res.panel = R(panel);
      res.panelRows = Array.from(panel.children).map((r) => ({
        ...R(r),
        kids: Array.from(r.children).map((k) => ({
          tag: k.tagName,
          txt: (k.textContent || '').trim().slice(0, 26),
          ...R(k),
          kids: Array.from(k.children)
            .slice(0, 3)
            .map((kk) => ({
              tag: kk.tagName,
              txt: (kk.textContent || '').trim().slice(0, 22),
              ...R(kk),
            })),
        })),
      }));
    }

    // Ô nhập
    const field = document.querySelector('.vj-booking-panel .rounded-vj');
    res.field = field ? R(field) : null;
    if (field) {
      res.fieldKids = Array.from(field.children).map((k) => ({
        tag: k.tagName,
        txt: (k.textContent || '').trim().slice(0, 26),
        ...R(k),
      }));
    }

    // Bottom nav
    const nav = document.querySelector('[data-testid="mobile-bottom-nav"]');
    res.bottomNav = nav ? R(nav) : null;
    res.bottomItems = nav
      ? Array.from(nav.querySelectorAll('li')).map((li) => ({
          txt: (li.textContent || '').trim(),
          box: R(li),
          icon: li.querySelector('svg') ? R(li.querySelector('svg')) : null,
          label: li.querySelector('span') ? R(li.querySelector('span')) : null,
        }))
      : null;

    // Khối kế tiếp sau hero
    const main = document.querySelector('main');
    res.afterHero = main && main.children[1] ? R(main.children[1]) : null;
    return res;
  });

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
