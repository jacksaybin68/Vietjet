#!/usr/bin/env node
/**
 * Dò cấu trúc vùng HERO của site thật ở mobile (390×844): container ảnh,
 * chiều cao thật, vị trí chấm slider, và header phủ lên trên.
 */
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');

const URL = process.argv[2] || 'https://www.vietjetair.com/vi/';

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
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    const R = (el) => {
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        tag: el.tagName,
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        position: c.position,
        objectFit: c.objectFit,
        overflow: c.overflow,
        backgroundImage: c.backgroundImage.slice(0, 90),
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));
    const res = {};

    // Ảnh hero: ảnh rộng >= 380px, nằm trong 400px đầu
    const img = all('img').find((i) => {
      const r = i.getBoundingClientRect();
      return r.width >= 380 && r.top < 400 && r.height > 150;
    });
    if (img) {
      res.img = { ...R(img), src: img.getAttribute('src') };
      // Leo lên 4 cấp cha để tìm container có chiều cao cố định
      let n = img;
      const chain = [];
      for (let i = 0; i < 5 && n; i++) {
        chain.push(R(n));
        n = n.parentElement;
      }
      res.imgChain = chain;
    }

    // Chấm slider: ul chứa các li 20x20
    const li = all('li').find((l) => {
      const r = l.getBoundingClientRect();
      return Math.round(r.width) === 20 && r.top > 200 && r.top < 500;
    });
    if (li) {
      let n = li;
      const chain = [];
      for (let i = 0; i < 4 && n; i++) {
        chain.push(R(n));
        n = n.parentElement;
      }
      res.dotsChain = chain;
      res.dotsCount = all('li').filter((l) => {
        const r = l.getBoundingClientRect();
        return Math.round(r.width) === 20 && r.top > 200 && r.top < 500;
      }).length;
    }

    // Header phủ: phần tử cha của logo
    const logo = all('img').find((i) => /logo/i.test(i.getAttribute('src') || ''));
    if (logo) {
      let n = logo;
      const chain = [];
      for (let i = 0; i < 6 && n; i++) {
        chain.push(R(n));
        n = n.parentElement;
      }
      res.headerChain = chain;
    }
    return res;
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
