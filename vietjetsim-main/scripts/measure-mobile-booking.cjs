#!/usr/bin/env node
/**
 * Đo giao diện MOBILE (390×844) của luồng đặt vé app local:
 *   /tim-ve  →  /thanh-toan
 * Chụp ảnh + đo hình học + phát hiện tràn ngang / lỗi console.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.SIM_URL || 'http://127.0.0.1:4028';
const OUT = path.join(__dirname, '..', '.screenshots-mobile-booking');
const VIEWPORT = { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 };
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

const PROBE = () => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 40),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage.slice(0, 120),
      radius: c.borderRadius,
    };
  };
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const c = getComputedStyle(el);
    return c.display !== 'none' && c.visibility !== 'hidden' && c.opacity !== '0';
  };
  const all = (sel) => Array.from(document.querySelectorAll(sel));
  const firstVisible = (sel) => all(sel).find(vis) || null;
  const byText = (sel, text) =>
    all(sel).find((el) => (el.textContent || '').trim().startsWith(text) && vis(el)) || null;

  const doc = document.documentElement;
  const offenders = [];
  if (doc.scrollWidth - doc.clientWidth > 0) {
    all('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 0 && r.height > 0) {
        offenders.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 70),
          right: Math.round(r.right),
          w: Math.round(r.width),
          text: (el.textContent || '').trim().slice(0, 30),
        });
      }
    });
  }

  const out = {
    viewport: { w: innerWidth, h: innerHeight },
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    horizontalOverflow: doc.scrollWidth - doc.clientWidth,
    offenders: offenders.slice(0, 15),
    header: box(firstVisible('header')),
    headerKids: firstVisible('header')
      ? Array.from(firstVisible('header').children).map((c) => ({
          tag: c.tagName,
          cls: (c.className || '').toString().slice(0, 60),
          box: box(c),
        }))
      : null,
    tripStrip: box(firstVisible('.vj-booking-strip')),
    tripStripTitle: box(firstVisible('.vj-booking-strip-title')),
    dateStrip: box(firstVisible('[data-testid="departure-date-strip"]')),
    dateCell: box(
      (() => {
        const s = firstVisible('[data-testid="departure-date-strip"]');
        return s && s.querySelector('button:not([aria-label])');
      })()
    ),
    h1: box(byText('h1', 'CHỌN CHUYẾN BAY') || byText('h1', 'Lựa chọn chuyến bay')),
    routeBoard: box(firstVisible('.rounded-vj.bg-white.border')),
    resultCount: box(byText('h2', 'chuyến bay phù hợp')),
    panel: box(firstVisible('aside')),
    panelH3: box(byText('aside h3', 'THÔNG TIN ĐẶT CHỗ')),
    panelBars: all('.vj-summary-bar').map((b) => box(b)),
    panelTotal: box(firstVisible('.vj-summary-total')),
    ctaMobile: box(all('button').find((b) => (b.textContent || '').trim() === 'Đi tiếp' && vis(b))),
    totalBarDesktop: box(firstVisible('.vj-total-bar')),
    bottomNav: box(firstVisible('[data-testid="mobile-bottom-nav"]')),
    fixedBars: all('div')
      .filter(
        (d) =>
          vis(d) && getComputedStyle(d).position === 'fixed' && d.getBoundingClientRect().height > 0
      )
      .map((d) => ({
        cls: (d.className || '').toString().slice(0, 80),
        box: box(d),
      })),
    // Thẻ giá vé đầu tiên
    fareCards: all('button')
      .filter((b) => /Eco|Deluxe|SkyBOSS|Business/i.test(b.textContent || ''))
      .slice(0, 6)
      .map((b) => box(b)),
  };
  return JSON.stringify(out);
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));

  const url = `${BASE}/tim-ve?from=HAN&to=SGN&depart=${TOMORROW}&adult=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 6000));

  const data = JSON.parse(await page.evaluate(PROBE));

  await page.screenshot({ path: path.join(OUT, 'tim-ve-mobile-viewport.png') });
  await page.screenshot({ path: path.join(OUT, 'tim-ve-mobile-full.png'), fullPage: true });

  console.log(JSON.stringify({ url, errors, measured: data }, null, 2));
  fs.writeFileSync(
    path.join(OUT, 'tim-ve-mobile.json'),
    JSON.stringify({ url, errors, measured: data }, null, 2)
  );

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
