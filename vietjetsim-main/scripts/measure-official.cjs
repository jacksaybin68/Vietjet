/**
 * Đo trực tiếp giao diện site thật (newweb.vietjetair.com) ở 1440×900 để đối
 * chiếu với kế hoạch "homepage-vietjet-parity".
 *
 * Dùng: node scripts/measure-official.cjs [url]
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://newweb.vietjetair.com/vi';

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
  await new Promise((r) => setTimeout(r, 3000));

  const data = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 80),
        text: (el.textContent || '').trim().slice(0, 60),
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: c.fontSize,
        lineHeight: c.lineHeight,
        fontWeight: c.fontWeight,
        fontFamily: c.fontFamily.split(',')[0],
        color: c.color,
        bg: c.backgroundColor,
        bgImage: c.backgroundImage.slice(0, 160),
        radius: c.borderRadius,
        padding: c.padding,
        shadow: c.boxShadow.slice(0, 100),
        textTransform: c.textTransform,
      };
    };
    const byText = (sel, text) =>
      Array.from(document.querySelectorAll(sel)).find((el) =>
        (el.textContent || '').trim().startsWith(text)
      );

    const out = { viewport: { w: innerWidth, h: innerHeight } };

    // Header: 4 tầng
    out.announce = box(document.querySelector('header')?.previousElementSibling);
    out.header = box(document.querySelector('header'));
    out.logo = box(
      document.querySelector('header img[alt*="Vietjet"], header svg[aria-label*="Vietjet"]')
    );
    out.nav = box(document.querySelector('header nav'));
    out.loginBtn = box(byText('header button, header a', 'Đăng nhập'));

    // Booking bar: tab + panel
    const tabFlightEl = byText('button, a', 'Đặt vé');
    out.tabFlight = box(tabFlightEl);
    out.tabsBar = box(tabFlightEl && tabFlightEl.parentElement);
    out.tabItem = box(tabFlightEl);
    const fromFieldEl = byText('button, div', 'Điểm khởi hành');
    out.fromField = box(fromFieldEl);
    out.fieldBox = box(fromFieldEl && fromFieldEl.closest('div'));
    const ctaEl = byText('button', 'Tìm chuyến bay');
    out.cta = box(ctaEl);
    out.ctaBox = box(ctaEl);

    // H2
    out.h2 = box(byText('h2', 'Ưu đãi giá tốt'));

    // Footer
    const footers = Array.from(document.querySelectorAll('footer'));
    out.footer = box(footers[footers.length - 1]);
    const fh = Array.from(document.querySelectorAll('h2')).find((h) =>
      (h.textContent || '').includes('Quy định, Chính sách')
    );
    out.footerSection = box(fh && fh.closest('section, div'));
    out.footerHeading = box(fh);

    out.bodyFont = getComputedStyle(document.body).fontFamily;
    out.bodySize = getComputedStyle(document.body).fontSize;

    return JSON.stringify(out);
  });

  console.log(JSON.stringify(JSON.parse(data), null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
