#!/usr/bin/env node
/**
 * Đo giao diện MOBILE (390×844) của SITE THẬT (vietjetair.com) để làm số đo
 * tham chiếu cho báo cáo đối chiếu mobile.
 *
 * Dùng: node scripts/measure-official-mobile.cjs [url] [outFile]
 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const URL = process.argv[2] || 'https://www.vietjetair.com/vi/';
const OUT =
  process.argv[3] || path.join(__dirname, '..', 'docs', 'qa', 'so-do-mobile-site-that.json');

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
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const c = getComputedStyle(el);
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
        fontSize: c.fontSize,
        fontWeight: c.fontWeight,
        color: c.color,
        background: c.backgroundColor,
        backgroundImage: c.backgroundImage,
        borderRadius: c.borderRadius,
        padding: c.padding,
      };
    };
    const all = (s) => Array.from(document.querySelectorAll(s));
    const byText = (sel, re) => all(sel).find((e) => re.test((e.textContent || '').trim()));

    const res = { url: location.href, viewport: { w: innerWidth, h: innerHeight } };

    // Thanh thông báo
    const announce = all('div').find(
      (d) =>
        /THÔNG BÁO|TIN MỚI/i.test(d.textContent || '') &&
        d.getBoundingClientRect().height < 60 &&
        d.getBoundingClientRect().height > 20 &&
        d.getBoundingClientRect().top < 60
    );
    res.announce = announce ? R(announce) : null;

    // Header mobile: logo + cụm nút phải
    const logo = all('img').find((i) => /logo/i.test(i.getAttribute('src') || ''));
    res.logo = logo ? { ...R(logo), src: logo.getAttribute('src') } : null;
    res.headerRow =
      logo && logo.parentElement && logo.parentElement.parentElement
        ? R(logo.parentElement.parentElement)
        : null;

    // Ảnh hero: phần tử ảnh lớn nhất nằm trong vùng 0..600px
    const heroImg = all('img')
      .map((i) => ({ i, r: i.getBoundingClientRect() }))
      .filter(({ r }) => r.width >= 380 && r.top < 600 && r.height > 200)
      .sort((a, b) => b.r.width - a.r.width)[0];
    res.heroImage = heroImg ? R(heroImg.i) : null;

    // Chấm slider
    const dots = all('li').filter((li) => {
      const r = li.getBoundingClientRect();
      return r.height > 10 && r.height < 40 && r.width > 10 && r.width < 40 && r.top > 200;
    });
    res.dots = {
      count: dots.length,
      box: dots.length ? R(dots[0].parentElement) : null,
      first: dots.length ? R(dots[0]) : null,
      items: dots.slice(0, 3).map((d) => R(d)),
    };

    // Tabs dịch vụ
    const tab1 = byText('button', /Mua hành lý/);
    const tab2 = byText('button', /Đổi thưởng/);
    const tab3 = byText('button', /Gửi hàng nhanh/);
    res.tabs = [tab1, tab2, tab3].map((t) =>
      t ? { text: (t.textContent || '').trim(), ...R(t) } : null
    );

    // Panel đặt vé: tìm khối có nền gradient đỏ chứa nút "Tìm chuyến bay"
    const cta = byText('button', /Tìm chuyến bay/i);
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
      const rows = Array.from(panel.children);
      res.panelRows = rows.map((r) => ({
        ...R(r),
        children: Array.from(r.children).map((k) => ({
          tag: k.tagName,
          text: (k.textContent || '').trim().slice(0, 30),
          ...R(k),
          children: Array.from(k.children)
            .slice(0, 4)
            .map((kk) => ({
              tag: kk.tagName,
              text: (kk.textContent || '').trim().slice(0, 24),
              ...R(kk),
            })),
        })),
      }));
    }
    res.cta = cta ? R(cta) : null;

    // Ô nhập sân bay / ngày
    const field = all('div').find(
      (d) =>
        /Điểm khởi hành/.test(d.textContent || '') &&
        d.getBoundingClientRect().width > 300 &&
        Math.round(d.getBoundingClientRect().height) === 48
    );
    if (field) {
      res.field = R(field);
      res.fieldChildren = Array.from(field.children).map((k) => ({
        tag: k.tagName,
        text: (k.textContent || '').trim().slice(0, 30),
        ...R(k),
        children: Array.from(k.children)
          .slice(0, 4)
          .map((kk) => ({
            tag: kk.tagName,
            text: (kk.textContent || '').trim().slice(0, 24),
            ...R(kk),
          })),
      }));
    }

    // Thanh điều hướng dưới
    const bottom = all('div').find(
      (d) =>
        /Đặt chuyến bay/.test(d.textContent || '') &&
        Math.round(d.getBoundingClientRect().height) === 62 &&
        d.getBoundingClientRect().top > 600
    );
    if (bottom) {
      res.bottomNav = R(bottom);
      res.bottomItems = Array.from(bottom.querySelectorAll('button')).map((b) => ({
        text: (b.textContent || '').trim(),
        ...R(b),
        label: b.querySelector('span span') ? R(b.querySelector('span span')) : null,
        icon: b.querySelector('img') ? R(b.querySelector('img')) : null,
      }));
    }

    return res;
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
