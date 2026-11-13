#!/usr/bin/env node
/**
 * Dò cấu trúc site thật (vietjetair.com) để tìm selector tương ứng với các
 * khối giao diện mà bản sim đã đo: header 4 tầng, booking panel, footer.
 *
 * Dùng: node scripts/probe-official.cjs [url]
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

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
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise((r) => setTimeout(r, 5000));

  const data = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 120),
        text: (el.textContent || '').trim().slice(0, 50),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: c.fontSize,
        fontWeight: c.fontWeight,
        fontFamily: c.fontFamily.split(',')[0],
        color: c.color,
        bg: c.backgroundColor,
        bgImage: c.backgroundImage.slice(0, 130),
        radius: c.borderRadius,
        position: c.position,
        zIndex: c.zIndex,
      };
    };
    const byText = (sel, text) =>
      Array.from(document.querySelectorAll(sel)).find((el) =>
        (el.textContent || '').trim().startsWith(text)
      );

    const out = {};

    // 1. Header: tìm phần tử chứa logo + "Đăng nhập" ở góc trên.
    const login = byText('a, button, span, div', 'Đăng nhập');
    out.login = box(login);
    out.headerCandidates = Array.from(document.querySelectorAll('header'))
      .slice(0, 6)
      .map((h) => ({ ...box(h), kids: h.children.length }));

    // 2. Các phần tử nền tối gradient (scrim).
    out.gradients = Array.from(document.querySelectorAll('div, header, section'))
      .map((el) => {
        const c = getComputedStyle(el);
        if (!c.backgroundImage.includes('gradient')) return null;
        const r = el.getBoundingClientRect();
        if (r.height < 60 || r.width < 1000) return null;
        return {
          cls: (el.className || '').toString().slice(0, 100),
          x: Math.round(r.x),
          y: Math.round(r.y + window.scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height),
          bgImage: c.backgroundImage.slice(0, 160),
          zIndex: c.zIndex,
          position: c.position,
        };
      })
      .filter(Boolean)
      .slice(0, 12);

    // 3. Logo
    out.logos = Array.from(document.querySelectorAll('img, svg'))
      .map((el) => ({ ...box(el), src: (el.getAttribute('src') || '').slice(0, 90) }))
      .filter((b) => b && b.w > 120 && b.h > 25 && b.h < 70)
      .slice(0, 8);

    // 4. Booking panel: nút "Điểm khởi hành" và "Tìm chuyến bay"
    const from = byText('button, div, span', 'Điểm khởi hành');
    out.fromField = box(from);
    out.fromParents = [];
    let p = from;
    for (let i = 0; i < 6 && p; i++) {
      out.fromParents.push(box(p));
      p = p.parentElement;
    }

    const cta = byText('button', 'Tìm chuyến bay');
    out.cta = box(cta);
    out.ctaParents = [];
    p = cta;
    for (let i = 0; i < 6 && p; i++) {
      out.ctaParents.push(box(p));
      p = p.parentElement;
    }

    // 5. Các nút trong header (menu)
    out.navButtons = Array.from(document.querySelectorAll('a, button, li'))
      .map((el) => box(el))
      .filter((b) => b && b.y < 200 && b.h > 10 && b.h < 60 && b.w < 400)
      .slice(0, 40);

    // 6. Footer
    const footers = Array.from(document.querySelectorAll('footer'));
    out.footerCount = footers.length;
    out.footer = box(footers[footers.length - 1]);
    out.footerH2 = Array.from(document.querySelectorAll('h2, h3'))
      .map((el) => box(el))
      .filter((b) => b && b.y > 2000)
      .slice(0, 10);

    out.body = {
      fontFamily: getComputedStyle(document.body).fontFamily,
      fontSize: getComputedStyle(document.body).fontSize,
      lineHeight: getComputedStyle(document.body).lineHeight,
      fontWeight: getComputedStyle(document.body).fontWeight,
      color: getComputedStyle(document.body).color,
    };

    return JSON.stringify(out, null, 1);
  });

  console.log(data);
  fs.writeFileSync('/tmp/official-probe.json', data);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
