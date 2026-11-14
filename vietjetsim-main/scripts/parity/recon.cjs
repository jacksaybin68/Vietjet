#!/usr/bin/env node
/**
 * recon.cjs — dò DOM sống của site thật để thiết kế probe theo ngữ nghĩa.
 * Chỉ in ra, KHÔNG ghi file, KHÔNG tải asset.
 */
const puppeteer = require('puppeteer-core');

const BASE = process.env.OFFICIAL_BASE || 'https://newweb.vietjetair.com';
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = process.argv[2]
  ? [{ slug: 'x', official: process.argv[2] }]
  : [
      { slug: 'home', official: '/vi/' },
      { slug: 'signin', official: '/vi/signin' },
      { slug: 'signup', official: '/vi/signup' },
      { slug: 'checkin', official: '/vi/checkin' },
      { slug: 'mysearch', official: '/vi/my/search-booking' },
      { slug: 'about', official: '/vi/about' },
      { slug: 'faq', official: '/vi/faq' },
      { slug: 'contact', official: '/vi/contact' },
      { slug: 'services', official: '/vi/services' },
    ];

const DUMP = () => {
  const out = {};
  const vis = (e) => {
    if (!e) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const desc = (e) => {
    const r = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return {
      tag: e.tagName.toLowerCase(),
      cls: (e.className && typeof e.className === 'string' ? e.className : '')
        .slice(0, 60)
        .trim(),
      role: e.getAttribute('role') || '',
      aria: e.getAttribute('aria-label') || '',
      text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
      fs: c.fontSize,
      fw: c.fontWeight,
      color: c.color,
      bg: c.backgroundColor,
      bgImg: c.backgroundImage === 'none' ? '' : c.backgroundImage.slice(0, 120),
      radius: c.borderRadius,
      border: c.border,
      shadow: c.boxShadow === 'none' ? '' : c.boxShadow.slice(0, 90),
      pad: c.padding,
      tt: c.textTransform,
      ff: c.fontFamily.split(',')[0],
      lh: c.lineHeight,
      ls: c.letterSpacing,
      z: c.zIndex,
      op: c.opacity,
    };
  };

  out.header = desc(document.querySelector('header'));
  const hs = Array.from(document.querySelectorAll('h1,h2,h3')).filter(vis).slice(0, 6);
  out.headings = hs.map(desc);
  const btns = Array.from(document.querySelectorAll('button,a[role=button]')).filter(vis);
  out.buttons = btns.slice(0, 40).map((b) => ({
    ...desc(b),
    text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
  }));
  out.inputs = Array.from(document.querySelectorAll('input,select,textarea'))
    .filter(vis)
    .slice(0, 12)
    .map((i) => ({
      ...desc(i),
      ph: i.getAttribute('placeholder') || '',
      aria: i.getAttribute('aria-label') || '',
      type: i.getAttribute('type') || i.tagName.toLowerCase(),
    }));
  out.footer = desc(document.querySelector('footer'));
  // các khối nền gradient
  out.gradients = Array.from(document.querySelectorAll('div,section,header,nav'))
    .filter(vis)
    .filter((e) => getComputedStyle(e).backgroundImage.includes('gradient'))
    .slice(0, 12)
    .map(desc);
  // các ảnh lớn
  out.images = Array.from(document.querySelectorAll('img'))
    .filter(vis)
    .filter((i) => i.getBoundingClientRect().width > 60)
    .slice(0, 12)
    .map((i) => ({
      ...desc(i),
      src: (i.getAttribute('src') || '').slice(-70),
    }));
  out.lists = Array.from(document.querySelectorAll('ul,nav')).filter(vis).slice(0, 8).map(desc);
  out.bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400);
  return out;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    try {
      await page.goto(BASE + route.official, {
        waitUntil: 'networkidle2',
        timeout: 90000,
      });
      await new Promise((r) => setTimeout(r, 3500));
      const data = await page.evaluate(DUMP);
      console.log(`\n\n########## ${route.slug} :: ${route.official}`);
      console.log(JSON.stringify(data, null, 1));
    } catch (e) {
      console.log(`\n########## ${route.slug} ERROR ${e.message}`);
    }
    await page.close();
  }
  await browser.close();
})();
