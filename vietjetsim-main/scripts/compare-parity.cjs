#!/usr/bin/env node
/**
 * So sánh số đo giao diện giữa site thật (vietjetair.com) và bản mô phỏng.
 *
 * Dùng: node scripts/compare-parity.cjs
 *
 * Cả hai trang được mở ở viewport 1440×900 rồi đo bằng `getComputedStyle` +
 * `getBoundingClientRect`. Vì site thật dùng class sinh tự động (jss120,
 * jss385…) còn bản sim dùng class riêng, mỗi phép đo có hai cách chọn phần
 * tử: `official` (theo nội dung/ngữ nghĩa) và `sim` (theo class của dự án).
 *
 * Kết quả in ra dạng bảng "giá trị site thật | giá trị bản sim | khớp?".
 */
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const OFFICIAL = process.env.PARITY_OFFICIAL_URL || 'https://www.vietjetair.com/vi/';
const SIM = process.env.PARITY_SIM_URL || 'http://127.0.0.1:4028/trang-chu';
const WIDTH = 1440;
const HEIGHT = 900;

function chromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Không tìm thấy Chrome/Chromium');
  return found;
}

/** Một phép đo: cùng một danh sách câu hỏi, hai cách chọn phần tử. */
const PROBES = [
  {
    key: 'body',
    label: 'Body — phông chữ gốc',
    questions: ['font-family', 'font-size', 'line-height', 'font-weight', 'color'],
    official: () => {
      const s = getComputedStyle(document.body);
      return {
        'font-family': s.fontFamily.split(',')[0],
        'font-size': s.fontSize,
        'line-height': s.lineHeight,
        'font-weight': s.fontWeight,
        color: s.color,
      };
    },
    sim: () => {
      const s = getComputedStyle(document.body);
      return {
        'font-family': s.fontFamily.split(',')[0],
        'font-size': s.fontSize,
        'line-height': s.lineHeight,
        'font-weight': s.fontWeight,
        color: s.color,
      };
    },
  },
  {
    key: 'scrim',
    label: 'Tầng 2 — lớp phủ tối',
    questions: ['top', 'height', 'z-index', 'background-image'],
    official: () => {
      const el = Array.from(document.querySelectorAll('div, header')).find((e) => {
        const s = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        return (
          s.backgroundImage.includes('rgba(0, 0, 0, 0.5)') &&
          s.backgroundImage.includes('0.094') &&
          r.height > 100 &&
          r.height < 140
        );
      });
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.y + window.scrollY),
        height: `${Math.round(r.height)}px`,
        'z-index': s.zIndex,
        'background-image': s.backgroundImage.slice(0, 95),
      };
    },
    sim: () => {
      const el = document.querySelector('.vj-header-scrim');
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.y + window.scrollY),
        height: `${Math.round(r.height)}px`,
        'z-index': s.zIndex,
        'background-image': s.backgroundImage.slice(0, 95),
      };
    },
  },
  {
    key: 'logo',
    label: 'Logo Vietjet',
    questions: ['x', 'y', 'size'],
    official: () => {
      const el = Array.from(document.querySelectorAll('img')).find(
        (i) => i.getBoundingClientRect().width > 200 && i.getBoundingClientRect().width < 300
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        size: `${Math.round(r.width)}×${Math.round(r.height)}px`,
      };
    },
    sim: () => {
      const el = document.querySelector('.vj-header-scrim img');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        size: `${Math.round(r.width)}×${Math.round(r.height)}px`,
      };
    },
  },
  {
    key: 'utility',
    label: 'Tầng 2b — hàng tiện ích (nút ngôn ngữ)',
    questions: ['y', 'height', 'font-size', 'font-weight'],
    official: () => {
      const el = Array.from(document.querySelectorAll('button')).find((b) =>
        (b.textContent || '').includes('Tiếng Việt')
      );
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        y: Math.round(r.y + window.scrollY),
        height: `${Math.round(r.height)}px`,
        'font-size': s.fontSize,
        'font-weight': s.fontWeight,
      };
    },
    sim: () => {
      const el = [...document.querySelectorAll('.vj-header-scrim button')].find((b) =>
        (b.textContent || '').includes('Tiếng Việt')
      );
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        y: Math.round(r.y + window.scrollY),
        height: `${Math.round(r.height)}px`,
        'font-size': s.fontSize,
        'font-weight': s.fontWeight,
      };
    },
  },
  {
    key: 'nav',
    label: 'Tầng 2c — menu chính',
    questions: ['y', 'height', 'gap', 'item-font-size', 'item-font-weight', 'right-edge'],
    official: () => {
      const li = Array.from(document.querySelectorAll('li')).find((e) =>
        (e.textContent || '').trim().startsWith('Chuyến bay của tôi')
      );
      if (!li) return null;
      const nav = li.closest('ul, nav') || li.parentElement;
      const s = getComputedStyle(nav);
      const a = li.querySelector('a') || li;
      const as = getComputedStyle(a);
      const items = Array.from(nav.querySelectorAll('li'));
      const last = items[items.length - 1];
      return {
        y: Math.round(li.getBoundingClientRect().y + window.scrollY),
        height: `${Math.round(li.getBoundingClientRect().height)}px`,
        gap: s.gap,
        'item-font-size': as.fontSize,
        'item-font-weight': as.fontWeight,
        'right-edge': Math.round(last.getBoundingClientRect().right),
      };
    },
    sim: () => {
      const nav = document.querySelector('.vj-nav-bar');
      if (!nav) return null;
      const s = getComputedStyle(nav);
      const a = nav.querySelector('a');
      const as = a ? getComputedStyle(a) : null;
      const items = nav.querySelectorAll('a');
      const last = items[items.length - 1];
      return {
        y: Math.round(nav.getBoundingClientRect().y + window.scrollY),
        height: `${Math.round(nav.getBoundingClientRect().height)}px`,
        gap: s.gap,
        'item-font-size': as ? as.fontSize : null,
        'item-font-weight': as ? as.fontWeight : null,
        'right-edge': last ? Math.round(last.getBoundingClientRect().right) : null,
      };
    },
  },
  {
    key: 'rail',
    label: 'Tầng 3 — dải dịch vụ phụ',
    questions: [
      'y',
      'height',
      'gap',
      'item-font-size',
      'item-font-weight',
      'left-edge',
      'right-edge',
    ],
    official: () => {
      const li = Array.from(document.querySelectorAll('li')).find(
        (e) => (e.textContent || '').trim() === 'Đặt vé' && e.getBoundingClientRect().y < 200
      );
      if (!li) return null;
      const rail = li.parentElement;
      const s = getComputedStyle(rail);
      const a = li.querySelector('a');
      const as = getComputedStyle(a);
      const items = Array.from(rail.querySelectorAll('li'));
      const last = items[items.length - 1];
      return {
        y: Math.round(li.getBoundingClientRect().y + window.scrollY),
        height: `${Math.round(li.getBoundingClientRect().height)}px`,
        gap: s.gap,
        'item-font-size': as.fontSize,
        'item-font-weight': as.fontWeight,
        'left-edge': Math.round(li.getBoundingClientRect().x),
        'right-edge': Math.round(last.getBoundingClientRect().right),
      };
    },
    sim: () => {
      const rail = document.querySelector('.vj-quick-rail');
      if (!rail) return null;
      const s = getComputedStyle(rail);
      const a = rail.querySelector('a');
      const as = a ? getComputedStyle(a) : null;
      const items = rail.querySelectorAll('li');
      const last = items[items.length - 1];
      return {
        y: Math.round(rail.getBoundingClientRect().y + window.scrollY),
        height: `${Math.round(rail.getBoundingClientRect().height)}px`,
        gap: s.gap,
        'item-font-size': as ? as.fontSize : null,
        'item-font-weight': as ? as.fontWeight : null,
        'left-edge': items[0] ? Math.round(items[0].getBoundingClientRect().x) : null,
        'right-edge': last ? Math.round(last.getBoundingClientRect().right) : null,
      };
    },
  },
  {
    key: 'hero',
    label: 'Hero — khối ảnh',
    questions: ['top', 'height', 'width'],
    official: () => {
      const el = Array.from(document.querySelectorAll('div')).find(
        (e) =>
          e.getBoundingClientRect().height > 700 &&
          e.getBoundingClientRect().height < 760 &&
          e.getBoundingClientRect().width > 1400
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.y + window.scrollY),
        height: `${Math.round(r.height)}px`,
        width: `${Math.round(r.width)}px`,
      };
    },
    sim: () => {
      const el = document.querySelector('section');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.y + window.scrollY),
        height: `${Math.round(r.height)}px`,
        width: `${Math.round(r.width)}px`,
      };
    },
  },
  {
    key: 'panel',
    label: 'Booking panel — thân form (gradient)',
    questions: ['x', 'y', 'size', 'border-radius', 'background-image'],
    official: () => {
      const el = Array.from(document.querySelectorAll('div')).find((e) => {
        const s = getComputedStyle(e);
        return s.backgroundImage.includes('rgba(217, 26, 33, 0.73)');
      });
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        size: `${Math.round(r.width)}×${Math.round(r.height)}px`,
        'border-radius': s.borderRadius,
        'background-image': s.backgroundImage.slice(0, 95),
      };
    },
    sim: () => {
      const el = document.querySelector('.vj-booking-panel');
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        size: `${Math.round(r.width)}×${Math.round(r.height)}px`,
        'border-radius': s.borderRadius,
        'background-image': s.backgroundImage.slice(0, 95),
      };
    },
  },
  {
    key: 'tabs',
    label: 'Booking panel — hàng tab',
    questions: ['height', 'label-font-size', 'label-font-weight', 'label-font-family'],
    official: () => {
      const body = Array.from(document.querySelectorAll('div')).find((e) =>
        getComputedStyle(e).backgroundImage.includes('rgba(217, 26, 33, 0.73)')
      );
      if (!body) return null;
      const outer = body.parentElement;
      const tabH = Math.round(
        outer.getBoundingClientRect().height - body.getBoundingClientRect().height
      );
      const label = Array.from(outer.querySelectorAll('a, span, div, p')).find((n) =>
        (n.textContent || '').trim().startsWith('Mua hành lý')
      );
      const ls = label ? getComputedStyle(label) : null;
      return {
        height: `${tabH}px`,
        'label-font-size': ls ? ls.fontSize : null,
        'label-font-weight': ls ? ls.fontWeight : null,
        'label-font-family': ls ? ls.fontFamily.split(',')[0] : null,
      };
    },
    sim: () => {
      const el = document.querySelector('.vj-booking-tabs');
      if (!el) return null;
      const label = el.querySelector('a span') || el.querySelector('a');
      const ls = label ? getComputedStyle(label) : null;
      return {
        height: `${Math.round(el.getBoundingClientRect().height)}px`,
        'label-font-size': ls ? ls.fontSize : null,
        'label-font-weight': ls ? ls.fontWeight : null,
        'label-font-family': ls ? ls.fontFamily.split(',')[0] : null,
      };
    },
  },
  {
    key: 'field',
    label: 'Booking panel — ô nhập',
    questions: ['height', 'border-radius', 'background-color'],
    official: () => {
      const el = Array.from(document.querySelectorAll('div, button')).find((e) => {
        const r = e.getBoundingClientRect();
        return (
          Math.round(r.height) === 48 &&
          r.width > 250 &&
          r.width < 380 &&
          getComputedStyle(e).borderRadius === '10px'
        );
      });
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        height: `${Math.round(el.getBoundingClientRect().height)}px`,
        'border-radius': s.borderRadius,
        'background-color': s.backgroundColor,
      };
    },
    sim: () => {
      const el = document.querySelector('.vj-booking-panel .h-\\[48px\\]');
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        height: `${Math.round(el.getBoundingClientRect().height)}px`,
        'border-radius': s.borderRadius,
        'background-color': s.backgroundColor,
      };
    },
  },
  {
    key: 'cta',
    label: 'Nút CTA "Tìm chuyến bay"',
    questions: ['x', 'y', 'size', 'border-radius', 'background-image', 'font-size', 'font-family'],
    official: () => {
      const el = Array.from(document.querySelectorAll('button')).find((b) =>
        (b.textContent || '').includes('Tìm chuyến bay')
      );
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        size: `${Math.round(r.width)}×${Math.round(r.height)}px`,
        'border-radius': s.borderRadius,
        'background-image': s.backgroundImage.slice(0, 95),
        'font-size': s.fontSize,
        'font-family': s.fontFamily.split(',')[0],
      };
    },
    sim: () => {
      const el = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').includes('Tìm chuyến bay')
      );
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y + window.scrollY),
        size: `${Math.round(r.width)}×${Math.round(r.height)}px`,
        'border-radius': s.borderRadius,
        'background-image': s.backgroundImage.slice(0, 95),
        'font-size': s.fontSize,
        'font-family': s.fontFamily.split(',')[0],
      };
    },
  },
  {
    key: 'footer',
    label: 'Footer — nền + tiêu đề cột',
    questions: ['background-color', 'heading-font-size', 'heading-font-weight', 'heading-color'],
    official: () => {
      const footer =
        document.querySelector('footer') ||
        Array.from(document.querySelectorAll('div')).find(
          (e) => e.getBoundingClientRect().height > 700 && e.getBoundingClientRect().top > 2000
        );
      if (!footer) return null;
      const s = getComputedStyle(footer);
      const h = Array.from(document.querySelectorAll('h1, h2, h3, h4, div, p')).find((e) =>
        (e.textContent || '').trim().startsWith('Mua hành lý, suất ăn')
      );
      const hs = h ? getComputedStyle(h) : null;
      return {
        'background-color': s.backgroundColor,
        'heading-font-size': hs ? hs.fontSize : null,
        'heading-font-weight': hs ? hs.fontWeight : null,
        'heading-color': hs ? hs.color : null,
      };
    },
    sim: () => {
      const footer = document.querySelector('footer');
      if (!footer) return null;
      const s = getComputedStyle(footer);
      const h = document.querySelector('.vj-footer-heading');
      const hs = h ? getComputedStyle(h) : null;
      return {
        'background-color': s.backgroundColor,
        'heading-font-size': hs ? hs.fontSize : null,
        'heading-font-weight': hs ? hs.fontWeight : null,
        'heading-color': hs ? hs.color : null,
      };
    },
  },
];

async function openPage(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  } catch {
    /* site thật có thể chặn một vài request — vẫn đo được phần đã render */
  }
  await new Promise((r) => setTimeout(r, 5000));
  return page;
}

async function measure(page, side) {
  const srcs = PROBES.map((p) => ({
    key: p.key,
    src: p[side].toString(),
  }));
  return page.evaluate((list) => {
    const out = {};
    for (const { key, src } of list) {
      try {
        out[key] = new Function(`return (${src})()`)();
      } catch (err) {
        out[key] = { error: String(err && err.message ? err.message : err) };
      }
    }
    return out;
  }, srcs);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  console.log(`Đo site thật : ${OFFICIAL}`);
  const officialPage = await openPage(browser, OFFICIAL);
  console.log(`  → ${officialPage.url()}`);
  const official = await measure(officialPage, 'official');

  console.log(`Đo bản sim   : ${SIM}`);
  const simPage = await openPage(browser, SIM);
  console.log(`  → ${simPage.url()}`);
  const sim = await measure(simPage, 'sim');

  await browser.close();

  const lines = [];
  let mismatch = 0;
  lines.push(`So sánh số đo — site thật vs bản sim (${WIDTH}×${HEIGHT})`);
  lines.push('');
  for (const probe of PROBES) {
    const o = official[probe.key] || {};
    const s = sim[probe.key] || {};
    lines.push(`▸ ${probe.label}`);
    for (const q of probe.questions) {
      const ov = o[q];
      const sv = s[q];
      const same = ov !== undefined && sv !== undefined && String(ov) === String(sv);
      if (!same) mismatch++;
      lines.push(
        `   ${same ? '✅' : '⚠️ '} ${q.padEnd(20)} site thật: ${String(ov ?? '—').padEnd(
          40
        )} | sim: ${sv ?? '—'}`
      );
    }
    lines.push('');
  }
  lines.push(`Kết quả: ${mismatch} điểm lệch.`);
  const text = lines.join('\n');
  console.log(text);
  fs.writeFileSync('/tmp/parity-report.txt', text);
  process.exitCode = mismatch ? 1 : 0;
})();
