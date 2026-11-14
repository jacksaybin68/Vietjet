#!/usr/bin/env node
/**
 * measure-official-auth-lookup.cjs — đo số đo trên SITE THẬT cho nhóm trang
 * xác thực + tra cứu: `/vi/signin` (popup SkyJoy), `/vi/signup`,
 * `/vi/my/search-booking`, `/vi/checkin`.
 *
 *   node scripts/measure-official-auth-lookup.cjs
 *
 * Chỉ ghi lại SỐ ĐO (kích thước / màu / font / bo góc / gradient). Không tải
 * asset, CSS hay font của site thật về repo (theo AGENTS.md).
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const APP_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(APP_ROOT, 'docs', 'qa', '2026-11-15-vietjet-measure');
const BASE = 'https://newweb.vietjetair.com';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = [
  { slug: 'signin', official: '/vi/signin' },
  { slug: 'signup', official: '/vi/signup' },
  { slug: 'my-search-booking', official: '/vi/my/search-booking' },
  { slug: 'checkin', official: '/vi/checkin' },
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
];

/** Số đo một phần tử: hộp + style tính toán. */
const BOX_FN = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      lh: c.lineHeight,
      fw: c.fontWeight,
      ff: c.fontFamily,
      color: c.color,
      bg: c.backgroundColor,
      bgImage: c.backgroundImage === 'none' ? null : c.backgroundImage,
      radius: c.borderRadius,
      shadow: c.boxShadow,
      border: c.borderTopWidth === '0px' ? null : c.border,
      borderBottom: c.borderBottomWidth === '0px' ? null : c.borderBottom,
      padding: c.padding,
      margin: c.margin,
      transform: c.transform === 'none' ? null : c.transform,
      textTransform: c.textTransform === 'none' ? null : c.textTransform,
      letterSpacing: c.letterSpacing,
    };
  };
  return box;
})()`;

const PROBE = `(() => {
  const box = ${BOX_FN};
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (e) => e && e.offsetParent !== null && e.getBoundingClientRect().height > 0;
  const txt = (e) => (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60);

  const header = document.querySelector('header');
  const h1s = q('h1').filter(vis);
  const h2s = q('h2').filter(vis);
  const h3s = q('h3').filter(vis);
  const inputs = q('input').filter(vis);
  const buttons = q('button').filter(vis);
  const links = q('a').filter(vis);

  // Popup đăng nhập: khung chứa iframe SkyID hoặc panel form.
  const iframe = document.querySelector('iframe');
  const popupCandidates = q('div').filter((d) => {
    const r = d.getBoundingClientRect();
    return r.width > 500 && r.width < 700 && r.height > 500 && r.height < 750;
  });

  const redBands = q('div').filter((d) => {
    const c = getComputedStyle(d);
    const bg = c.backgroundImage || '';
    return /gradient/.test(bg) && /217,\\s*26,\\s*33|236,\\s*32,\\s*41|171,\\s*3,\\s*3/.test(bg);
  });

  return {
    url: location.href,
    title: document.title,
    header: box(header),
    headerBg: header ? getComputedStyle(header).backgroundColor : null,
    headerRadius: header ? getComputedStyle(header).borderRadius : null,
    h1: h1s.map((e) => ({ text: txt(e), ...box(e) })),
    h2: h2s.map((e) => ({ text: txt(e), ...box(e) })),
    h3: h3s.slice(0, 8).map((e) => ({ text: txt(e), ...box(e) })),
    inputs: inputs.slice(0, 8).map((e) => ({
      type: e.type,
      name: e.name || e.id || null,
      placeholder: e.placeholder || null,
      ariaLabel: e.getAttribute('aria-label'),
      wrapper: box(e.parentElement),
      self: box(e),
    })),
    buttons: buttons.slice(0, 30).map((e) => ({ text: txt(e), ...box(e) })),
    links: links.slice(0, 40).map((e) => ({ text: txt(e), ...box(e) })),
    iframe: box(iframe),
    iframeSrc: iframe ? iframe.src : null,
    popupCandidates: popupCandidates.slice(0, 5).map((e) => ({
      text: txt(e),
      cls: (e.className || '').toString().slice(0, 120),
      ...box(e),
    })),
    redBands: redBands.slice(0, 6).map((e) => ({ text: txt(e), ...box(e) })),
    bodyText: (document.body.innerText || '').replace(/\\n{2,}/g, '\\n').slice(0, 2500),
  };
})()`;

async function measure() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      try {
        await page.goto(BASE + route.official, {
          waitUntil: 'networkidle2',
          timeout: 120000,
        });
        await new Promise((r) => setTimeout(r, 5000));
        const data = await page.evaluate(PROBE);
        results.push({ route: route.slug, viewport: vp.name, ...data });
      } catch (err) {
        results.push({
          route: route.slug,
          viewport: vp.name,
          error: String((err && err.message) || err),
        });
      }
      await page.close();
    }
  }

  await browser.close();
  return results;
}

measure()
  .then((results) => {
    for (const r of results) {
      fs.writeFileSync(
        path.join(OUT_DIR, `official-${r.route}-${r.viewport}.json`),
        JSON.stringify(r, null, 2)
      );
    }
    console.log(`Da ghi ${results.length} tep vao ${OUT_DIR}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
