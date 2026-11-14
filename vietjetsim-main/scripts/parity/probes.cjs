#!/usr/bin/env node
/**
 * scripts/parity/probes.cjs — BỘ ĐO DÙNG CHUNG cho site thật và app local.
 *
 * Vì sao không so theo class:
 *   Site thật là React SPA, class do JSS sinh ra (`jss120`, `jss385`…) và đổi
 *   theo bản build; app local dùng class riêng (`.vj-booking-field__label`).
 *   Nếu so theo class thì hai bên không bao giờ chạm nhau. Vì vậy MỖI vị trí
 *   được định danh bằng NGỮ NGHĨA (vai trò hiển thị / nội dung chữ / thẻ), và
 *   đúng một bộ câu hỏi được hỏi trên cả hai bên.
 *
 * Quy tắc bất biến (AGENTS.md): chỉ ĐO. Không tải CSS/font/asset của site thật
 * về repo.
 *
 * Mỗi slot trả về một "bản đo" gồm:
 *   hình học:   x, y, w, h
 *   chữ:        font-family, font-size, font-weight, line-height,
 *               letter-spacing, text-transform, color
 *   nền:        background-color, background-image (gradient)
 *   viền:       border, border-radius, box-shadow, opacity
 *   hộp:        padding, margin, gap, z-index, position, display, overflow
 *   chuyển động: transition, animation
 */
'use strict';

/** Thuộc tính được đọc từ `getComputedStyle` cho mỗi vị trí. */
const STYLE_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'color',
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'border',
  'borderRadius',
  'boxShadow',
  'opacity',
  'padding',
  'margin',
  'gap',
  'zIndex',
  'position',
  'display',
  'overflow',
  'transition',
  'animation',
  'textAlign',
  'flexDirection',
  'alignItems',
  'justifyContent',
];

/**
 * Hàm chạy TRONG TRÌNH DUYỆT. Nó được serialize thành string rồi `new Function`
 * lại — nên không được đóng bên ngoài trừ `STYLE_PROPS` và `SLOT_DEFS`.
 */
function inBrowser() {
  const STYLE_PROPS = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'textTransform',
    'color',
    'backgroundColor',
    'backgroundImage',
    'backgroundSize',
    'backgroundPosition',
    'border',
    'borderRadius',
    'boxShadow',
    'opacity',
    'padding',
    'margin',
    'gap',
    'zIndex',
    'position',
    'display',
    'overflow',
    'transition',
    'animation',
    'textAlign',
    'flexDirection',
    'alignItems',
    'justifyContent',
  ];

  /** Phần tử đang hiển thị đúng 1 phần tử. */
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };

  /** Chuẩn hoá text cho so khớp (bỏ khoảng trắng thừa, lowercase). */
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

  /** Tìm phần tử đầu tiên có chứa đúng chuỗi (hoặc bắt đầu bằng). */
  const byText = (selector, text, { exact = false } = {}) => {
    const target = norm(text).toLowerCase();
    return (
      Array.from(document.querySelectorAll(selector)).find((el) => {
        const t = norm(el.textContent).toLowerCase();
        return exact ? t === target : t.includes(target);
      }) || null
    );
  };

  /** Tìm phần tử hiển thị đầu tiên khớp selector. */
  const firstVisible = (selector) =>
    Array.from(document.querySelectorAll(selector)).find(visible) || null;

  /** Đo một phần tử. */
  const measure = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const out = {
      tag: el.tagName.toLowerCase(),
      text: norm(el.textContent).slice(0, 60),
      x: Math.round(r.x),
      y: Math.round(r.y + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
    for (const p of STYLE_PROPS) {
      out[p] = cs[p];
    }
    // Gradient có thể rất dài — rút gọn nhưng giữ đủ để so khớp.
    out.backgroundImage = cs.backgroundImage === 'none' ? 'none' : cs.backgroundImage.slice(0, 220);
    out.transition = cs.transition === 'all 0s ease 0s' ? 'none' : cs.transition.slice(0, 140);
    out.animation = cs.animationName === 'none' ? 'none' : cs.animation.slice(0, 140);
    out.fontFamily = cs.fontFamily.split(',')[0].replace(/["']/g, '');
    return out;
  };

  /** Bản đo của phần tử con đầu tiên hợp lệ (nhãn / giá trị / icon). */
  const child = (el, selector) => {
    if (!el) return null;
    const found = Array.from(el.querySelectorAll(selector)).find(visible);
    return found ? measure(found) : null;
  };

  /* ---------------------------------------------------------------------
   * BỘ SLOT — mỗi slot là một "vị trí" cần đo. Cùng danh sách cho cả
   * site thật lẫn app local.
   * ------------------------------------------------------------------ */
  const SLOTS = [
    /* ---- Header / chrome chung ---- */
    {
      key: 'header',
      label: 'Header — khung tổng',
      resolve: () => firstVisible('header') || firstVisible('[role="banner"]'),
    },
    {
      key: 'header-logo',
      label: 'Header — logo',
      resolve: () => {
        const img = firstVisible('header img');
        if (img) return img;
        const svg = firstVisible('header svg');
        return svg || null;
      },
    },
    {
      key: 'header-support',
      label: 'Header — mục "Hỗ trợ"',
      resolve: () => byText('header button, header a, header span, header div', 'Hỗ trợ'),
    },
    {
      key: 'header-login',
      label: 'Header — nút "Đăng nhập"',
      resolve: () => byText('header button, header a', 'Đăng nhập'),
    },
    {
      key: 'header-register',
      label: 'Header — mục "Đăng ký"',
      resolve: () => byText('header button, header a', 'Đăng ký'),
    },
    {
      key: 'header-lang',
      label: 'Header — nút ngôn ngữ',
      resolve: () => byText('header button, header a', 'Tiếng Việt'),
    },
    {
      key: 'header-nav',
      label: 'Header — hàng menu chính',
      resolve: () => firstVisible('header nav ul') || firstVisible('header nav'),
    },
    {
      key: 'header-nav-item',
      label: 'Header — một mục menu chính',
      resolve: () => {
        const nav = firstVisible('header nav ul') || firstVisible('header nav');
        if (!nav) return null;
        return Array.from(nav.querySelectorAll('li a, li, a')).find(visible) || null;
      },
    },
    {
      key: 'header-app-download',
      label: 'Header — pill "Tải ứng dụng"',
      resolve: () => byText('header button, header a', 'Tải ứng dụng'),
    },

    /* ---- Dải đặt vé (booking bar) ---- */
    {
      key: 'booking-shell',
      label: 'Dải đặt vé — khung chứa',
      resolve: () => {
        const cta = byText('button, a', 'Tìm chuyến bay');
        if (!cta) return null;
        // Vỏ ngoài cùng: dòng cha của khung form.
        return cta.closest('form') || cta.parentElement?.parentElement || null;
      },
    },
    {
      key: 'booking-rail',
      label: 'Dải đặt vé — rail dịch vụ (tab)',
      resolve: () => {
        const cta = byText('button, a', 'Tìm chuyến bay');
        const rail = byText('button, a', 'Đặt vé') || byText('button, a', 'Đặt chuyến bay');
        if (rail && rail.parentElement) return rail.parentElement;
        return cta ? cta.parentElement : null;
      },
    },
    {
      key: 'booking-rail-tab',
      label: 'Dải đặt vé — một tab dịch vụ',
      resolve: () => {
        const rail = byText('button, a', 'Đặt vé');
        return rail || null;
      },
    },
    {
      key: 'booking-field-from',
      label: 'Dải đặt vé — ô "Điểm khởi hành"',
      resolve: () => {
        const el =
          document.querySelector('[aria-label="Điểm khởi hành"]') ||
          byText('button, div, label', 'Điểm khởi hành');
        return el;
      },
    },
    {
      key: 'booking-field-from-label',
      label: 'Dải đặt vé — nhãn ô khởi hành',
      resolve: () => {
        const el =
          document.querySelector('[aria-label="Điểm khởi hành"]') ||
          byText('button, div, label', 'Điểm khởi hành');
        if (!el) return null;
        const span = Array.from(el.querySelectorAll('span, div, label')).find(
          (s) => norm(s.textContent).toLowerCase().includes('khởi hành') && visible(s)
        );
        return span || null;
      },
    },
    {
      key: 'booking-field-to',
      label: 'Dải đặt vé — ô "Điểm đến"',
      resolve: () =>
        document.querySelector('[aria-label="Điểm đến"]') ||
        byText('button, div, label', 'Điểm đến'),
    },
    {
      key: 'booking-field-date',
      label: 'Dải đặt vé — ô "Ngày đi"',
      resolve: () => byText('button, div, label, span', 'Ngày đi'),
    },
    {
      key: 'booking-cta',
      label: 'Dải đặt vé — nút "Tìm chuyến bay"',
      resolve: () => byText('button', 'Tìm chuyến bay'),
    },

    /* ---- Form tra cứu (underline) ---- */
    {
      key: 'lookup-field',
      label: 'Form tra cứu — ô nhập',
      resolve: () => {
        const inputs = Array.from(document.querySelectorAll('input')).filter(visible);
        const withText = inputs.find((i) => norm(i.textContent).length >= 0);
        const first = withText || inputs[0];
        if (!first) return null;
        return first.parentElement || first;
      },
    },
    {
      key: 'lookup-input',
      label: 'Form tra cứu — thẻ input',
      resolve: () => Array.from(document.querySelectorAll('input')).find(visible) || null,
    },
    {
      key: 'lookup-label',
      label: 'Form tra cứu — nhãn nổi',
      resolve: () => {
        const labels = Array.from(document.querySelectorAll('label')).filter(visible);
        return labels[0] || null;
      },
    },
    {
      key: 'lookup-submit',
      label: 'Form tra cứu — nút "Tìm kiếm"',
      resolve: () => byText('button', 'Tìm kiếm'),
    },

    /* ---- Nút / tiêu đề chung ---- */
    {
      key: 'page-title',
      label: 'Trang — tiêu đề chính (h1)',
      resolve: () => firstVisible('h1'),
    },
    {
      key: 'page-subtitle',
      label: 'Trang — tiêu đề phụ (h2)',
      resolve: () => firstVisible('h2'),
    },
    {
      key: 'page-paragraph',
      label: 'Trang — đoạn mô tả đầu tiên',
      resolve: () => firstVisible('main p, p'),
    },

    /* ---- Khối dịch vụ / thẻ ---- */
    {
      key: 'service-card',
      label: 'Dịch vụ — thẻ đầu tiên',
      resolve: () => {
        const cands = Array.from(
          document.querySelectorAll('main a, main li, main article, section a, section li')
        ).filter(visible);
        return cands.find((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 150 && r.width < 400 && r.height > 80 && r.height < 400;
        }) || null;
      },
    },

    /* ---- Dải dịch vụ tab (pill) ---- */
    {
      key: 'pill-tab',
      label: 'Dải pill — tab đầu tiên',
      resolve: () => {
        const cands = Array.from(document.querySelectorAll('button, a')).filter((el) => {
          if (!visible(el)) return false;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return (
            r.height >= 30 &&
            r.height <= 42 &&
            r.width >= 120 &&
            parseFloat(cs.borderRadius) >= 12
          );
        });
        return cands[0] || null;
      },
    },

    /* ---- Footer ---- */
    {
      key: 'footer',
      label: 'Footer — khung',
      resolve: () => firstVisible('footer'),
    },
    {
      key: 'footer-heading',
      label: 'Footer — tiêu đề cột',
      resolve: () => {
        const footer = firstVisible('footer');
        if (!footer) return null;
        return (
          Array.from(footer.querySelectorAll('h1, h2, h3, h4, strong, b')).find(visible) || null
        );
      },
    },
    {
      key: 'footer-link',
      label: 'Footer — một liên kết',
      resolve: () => {
        const footer = firstVisible('footer');
        if (!footer) return null;
        return Array.from(footer.querySelectorAll('a')).find(visible) || null;
      },
    },

    /* ---- Bottom nav (mobile) ---- */
    {
      key: 'bottom-nav',
      label: 'Bottom nav — thanh đáy',
      resolve: () => {
        const nav =
          document.querySelector('[data-testid="mobile-bottom-nav"]') ||
          firstVisible('nav[aria-label*="điều hướng"], nav[aria-label*="navigation"]');
        return nav;
      },
    },
    {
      key: 'bottom-nav-item',
      label: 'Bottom nav — một mục',
      resolve: () => {
        const nav =
          document.querySelector('[data-testid="mobile-bottom-nav"]') ||
          firstVisible('nav[aria-label*="điều hướng"], nav[aria-label*="navigation"]');
        if (!nav) return null;
        return Array.from(nav.querySelectorAll('a, button')).find(visible) || null;
      },
    },

    /* ---- Popup / modal đăng nhập ---- */
    {
      key: 'popup-frame',
      label: 'Popup đăng nhập — khung',
      resolve: () =>
        document.querySelector('.vj-popup-frame') ||
        firstVisible('[role="dialog"]') ||
        null,
    },
    {
      key: 'popup-header',
      label: 'Popup đăng nhập — băng tiêu đề',
      resolve: () =>
        document.querySelector('.vj-popup-header') ||
        (document.querySelector('[role="dialog"]')?.querySelector('header') || null),
    },
    {
      key: 'popup-nav',
      label: 'Popup đăng nhập — thanh đáy trong popup',
      resolve: () =>
        document.querySelector('.vj-popup-nav') ||
        document.querySelector('[role="dialog"]')?.querySelector('nav') ||
        null,
    },

    /* ---- Khung SkyID (trang xác thực) ---- */
    {
      key: 'skyid-card',
      label: 'SkyID — thẻ form',
      resolve: () => document.querySelector('.vj-skyid-card') || null,
    },
    {
      key: 'skyid-input',
      label: 'SkyID — ô nhập',
      resolve: () => document.querySelector('.vj-skyid-input') || firstVisible('input'),
    },
    {
      key: 'skyid-submit',
      label: 'SkyID — nút gửi',
      resolve: () => document.querySelector('.vj-skyid-btn') || byText('button', 'Đăng nhập'),
    },

    /* ---- Thẻ giá vé (kết quả tìm vé) ---- */
    {
      key: 'fare-card',
      label: 'Thẻ hạng vé — thẻ đầu tiên',
      resolve: () => {
        const cands = Array.from(document.querySelectorAll('button, li, article, div')).filter(
          (el) => {
            if (!visible(el)) return false;
            const r = el.getBoundingClientRect();
            const t = norm(el.textContent);
            return (
              r.width > 120 &&
              r.width < 420 &&
              r.height > 60 &&
              r.height < 320 &&
              /eco|deluxe|business|skyboss|phổ thông|thương gia/i.test(t)
            );
          }
        );
        // Ưu tiên phần tử nhỏ nhất (thẻ, không phải cả khối cha).
        cands.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return ra.width * ra.height - rb.width * rb.height;
        });
        return cands[0] || null;
      },
    },
    {
      key: 'fare-button',
      label: 'Thẻ hạng vé — nút chọn',
      resolve: () => {
        const card = byText('button, li, article, div', 'Chọn');
        return card && visible(card) ? card : null;
      },
    },
  ];

  /* ---------------------------------------------------------------------
   * Thu thập
   * ------------------------------------------------------------------ */
  const out = {};
  for (const slot of SLOTS) {
    let value = null;
    try {
      value = measure(slot.resolve());
    } catch (err) {
      value = { error: String(err && err.message ? err.message : err) };
    }
    out[slot.key] = value;
  }

  // Thu thêm: thẻ con (nhãn/giá trị) cho các slot cần chi tiết.
  try {
    const from = document.querySelector('[aria-label="Điểm khởi hành"]');
    out['booking-field-from-child-label'] = child(from, 'span, label, div');
    out['booking-field-from-child-value'] = child(from, 'p, strong, b, span');
  } catch {
    /* không có panel đặt vé */
  }

  // Bảng màu quan sát được trên trang (đếm tần suất màu chữ/nền).
  try {
    const freq = {};
    const els = Array.from(document.querySelectorAll('body *')).slice(0, 4000);
    for (const el of els) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
        if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue;
        freq[v] = (freq[v] || 0) + 1;
      }
    }
    out['__palette'] = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60);
  } catch {
    out['__palette'] = [];
  }

  // Font đang nạp.
  try {
    out['__fonts'] = Array.from(document.fonts || [])
      .map((f) => `${f.family} ${f.weight} ${f.style}`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 40);
  } catch {
    out['__fonts'] = [];
  }

  out['__body'] = measure(document.body);
  out['__viewport'] = { w: window.innerWidth, h: window.innerHeight };

  return out;
}

/** Danh sách route: app local ↔ site thật. */
const ROUTES = [
  {
    slug: 'home',
    label: 'Trang chủ',
    local: '/trang-chu',
    official: '/vi/',
  },
  {
    slug: 'booking-search',
    label: 'Tìm chuyến bay',
    local: '/tim-ve?from=HAN&to=SGN&depart=2026-11-20&adult=1',
    official: '/vi/pages/booking-search?departAirport=HAN&arrivalAirport=SGN&departDate=2026-11-20&adult=1&child=0&infant=0',
  },
  {
    slug: 'signin',
    label: 'Đăng nhập',
    local: '/dang-nhap',
    official: '/vi/signin',
  },
  {
    slug: 'signup',
    label: 'Đăng ký',
    local: '/dang-ky',
    official: '/vi/signup',
  },
  {
    slug: 'forgot-password',
    label: 'Quên mật khẩu',
    local: '/quen-mat-khau',
    official: '/vi/forgot-password',
  },
  {
    slug: 'my-search-booking',
    label: 'Chuyến bay của tôi',
    local: '/chuyen-bay-cua-toi',
    official: '/vi/my/search-booking',
  },
  {
    slug: 'checkin',
    label: 'Làm thủ tục',
    local: '/lam-thu-tuc',
    official: '/vi/checkin',
  },
  {
    slug: 'service',
    label: 'Dịch vụ',
    local: '/dich-vu',
    official: '/vi/pages/service',
  },
  {
    slug: 'about',
    label: 'Giới thiệu',
    local: '/gioi-thieu',
    official: '/vi/about',
  },
  {
    slug: 'faq',
    label: 'Hỏi đáp',
    local: '/hoi-dap',
    official: '/vi/faq',
  },
  {
    slug: 'contact',
    label: 'Liên hệ',
    local: '/lien-he',
    official: '/vi/contact',
  },
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
  { name: 'tablet-768', width: 768, height: 1024, mobile: false },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
];

module.exports = { inBrowser, ROUTES, VIEWPORTS, STYLE_PROPS };
