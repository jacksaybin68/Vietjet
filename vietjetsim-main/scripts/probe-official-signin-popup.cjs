#!/usr/bin/env node
/**
 * probe-official-signin-popup.cjs — đo popup đăng nhập của SITE THẬT.
 *
 * Site thật mở popup khi bấm nút "Đăng nhập" ở header (Keycloak/SkyJoy nhúng
 * trong iframe). Script này:
 *   1. mở `/vi/`,
 *   2. bấm nút "Đăng nhập",
 *   3. chờ popup render,
 *   4. ghi số đo: khung popup, băng đỏ, iframe, bottom nav, nút.
 *
 * Chỉ ghi SỐ ĐO — không tải asset/CSS/font của site thật về repo.
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const APP_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(APP_ROOT, 'docs', 'qa', '2026-11-15-vietjet-measure');
const BASE = 'https://newweb.vietjetair.com';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
];

const PROBE = `(() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
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
      padding: c.padding,
      position: c.position,
      zIndex: c.zIndex,
      overflow: c.overflow,
      textTransform: c.textTransform === 'none' ? null : c.textTransform,
    };
  };
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (e) => e && e.getBoundingClientRect().height > 0;
  const txt = (e) => (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 70);

  // Ứng viên khung popup: phần tử có kích thước gần 622×664.
  const candidates = q('div')
    .filter((d) => {
      const r = d.getBoundingClientRect();
      if (r.width < 480 || r.width > 760) return false;
      if (r.height < 400 || r.height > 820) return false;
      return getComputedStyle(d).overflow === 'hidden' || getComputedStyle(d).borderRadius !== '0px';
    })
    .map((d) => ({
      text: txt(d),
      cls: (d.className || '').toString().slice(0, 140),
      children: d.children.length,
      ...box(d),
    }))
    // Ưu tiên khung lớn nhất.
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, 6);

  // Băng đỏ: nền gradient đỏ ở đỉnh khung.
  const redBands = q('div')
    .filter((d) => {
      const bg = getComputedStyle(d).backgroundImage || '';
      return /gradient/.test(bg) && /(217|236|171), *(26|32|3),/.test(bg);
    })
    .map((d) => ({ text: txt(d), cls: (d.className || '').toString().slice(0, 140), ...box(d) }))
    .sort((a, b) => a.y - b.y)
    .slice(0, 6);

  const iframes = q('iframe')
    .filter((e) => e.getBoundingClientRect().height > 50)
    .map((e) => ({ src: (e.src || '').slice(0, 160), ...box(e) }));

  const navs = q('nav')
    .filter(vis)
    .map((e) => ({ text: txt(e), ...box(e) }))
    .filter((n) => n.h > 0 && n.h < 120);

  const bottomBars = q('div')
    .filter((d) => {
      const r = d.getBoundingClientRect();
      return r.height > 40 && r.height < 100 && r.width > 300 && r.bottom > window.innerHeight - 140;
    })
    .map((d) => ({ text: txt(d), cls: (d.className || '').toString().slice(0, 140), ...box(d) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 6);

  return {
    url: location.href,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    candidates,
    redBands,
    iframes,
    navs,
    bottomBars,
    buttons: q('button')
      .filter(vis)
      .map((e) => ({ text: txt(e), ...box(e) }))
      .filter((b) => b.text)
      .slice(0, 30),
    bodyText: (document.body.innerText || '').replace(/\\n{2,}/g, '\\n').slice(0, 2000),
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
      await page.goto(`${BASE}/vi/`, { waitUntil: 'networkidle2', timeout: 120000 });
      await new Promise((r) => setTimeout(r, 3500));

      // Bấm nút "Đăng nhập" ở header để mở popup.
      const clicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          /đăng nhập/i.test(b.textContent || '')
        );
        if (!btn) return false;
        btn.click();
        return true;
      });
      await new Promise((r) => setTimeout(r, 6000));

      const data = await page.evaluate(PROBE);
      results.push({ route: 'signin-popup', viewport: vp.name, clicked, data });
    } catch (err) {
      results.push({
        route: 'signin-popup',
        viewport: vp.name,
        error: String((err && err.message) || err),
      });
    }
    await page.close();
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
