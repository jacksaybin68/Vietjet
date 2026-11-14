#!/usr/bin/env node
/**
 * Chụp cận cảnh (clip) vùng ô nhập đầu tiên trên site thật + ghi style từng
 * lớp, để xác định nhãn hiển thị thực tế (màu, cỡ, vị trí).
 *
 * Chạy: node scripts/probe-official-field-zoom.cjs
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(__dirname, '..', 'docs', 'qa', '2026-11-15-vietjet-measure');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const vp of [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'mobile-390', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.width < 500 });
    await page.goto('https://newweb.vietjetair.com/vi/checkin', {
      waitUntil: 'networkidle2',
      timeout: 90_000,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const info = await page.evaluate(() => {
      const input = document.querySelector('input[name="reservationLocator"]');
      const fc = input.closest('[class*="MuiFormControl"]');
      const label = fc.querySelector('label');
      const r = fc.getBoundingClientRect();
      // tìm mọi element có text "Mã đặt chỗ" (kể cả cha)
      const matches = [...document.querySelectorAll('*')]
        .filter((el) => /Mã đặt chỗ/.test(el.textContent || '') && el.children.length === 0)
        .map((el) => {
          const cs = getComputedStyle(el);
          const rr = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 100),
            x: Math.round(rr.x),
            y: Math.round(rr.y),
            w: Math.round(rr.width),
            h: Math.round(rr.height),
            fs: cs.fontSize,
            fw: cs.fontWeight,
            color: cs.color,
            opacity: cs.opacity,
            visibility: cs.visibility,
            position: cs.position,
            transform: cs.transform,
            zIndex: cs.zIndex,
            overflow: cs.overflow,
            clipPath: cs.clipPath,
            textShadow: cs.textShadow,
          };
        });
      const lcs = getComputedStyle(label);
      const before = getComputedStyle(label, '::before');
      const after = getComputedStyle(label, '::after');
      return {
        fieldRect: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        matches,
        labelStyle: {
          color: lcs.color,
          fs: lcs.fontSize,
          transform: lcs.transform,
          textShadow: lcs.textShadow,
        },
        before: { content: before.content, color: before.color, fs: before.fontSize },
        after: { content: after.content, color: after.color, fs: after.fontSize },
        html: fc.outerHTML.slice(0, 1200),
      };
    });

    console.log(`\n== ${vp.name}`);
    console.log(JSON.stringify(info, null, 1));

    const clip = info.fieldRect;
    const file = path.join(OUT, `official-field-zoom-${vp.name}.png`);
    await page.screenshot({
      path: file,
      clip: {
        x: Math.max(0, clip.x - 10),
        y: Math.max(0, clip.y - 30),
        width: Math.min(vp.width - clip.x + 10, clip.w + 20),
        height: clip.h + 60,
      },
    });
    console.log(`saved ${file}`);
    await page.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
