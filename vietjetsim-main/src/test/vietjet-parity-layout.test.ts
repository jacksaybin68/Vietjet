import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Chốt regression cho bộ số đo đã đo trên DOM sống của
 * `newweb.vietjetair.com` (baseline: `docs/qa/2026-11-15-vietjet-measure/`).
 *
 * Nguyên tắc của `AGENTS.md`: chỉ **đo** số đo từ DOM sống, không tải asset /
 * CSS / font của site thật. Bộ test này ghim các giá trị đo được vào token
 * CSS cục bộ để một đợt refactor nào đó không vô tình lệch khỏi site thật.
 *
 * Ngưỡng: cỡ chữ / bo góc / màu khớp tuyệt đối; kích thước ±2px.
 */

const CSS_PATH = path.join(process.cwd(), 'src/styles/tailwind.css');
const CSS = fs.readFileSync(CSS_PATH, 'utf8');
/** CSS bỏ comment để rule matching không bị nhiễu bởi chú thích. */
const CSS_RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** Lấy giá trị một custom property trong khối `:root`. */
function token(name: string): string {
  const match = CSS.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Thiếu token --${name} trong src/styles/tailwind.css`);
  return match[1].trim();
}

/**
 * Lấy giá trị một thuộc tính trong rule có selector cho trước.
 * Selector có thể nằm trong danh sách phân tách bằng dấu phẩy
 * (`.vj-lookup-btn, .vj-search-btn { … }`).
 */
function ruleValue(selector: string, property: string): string {
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(CSS_RULES)) !== null) {
    const selectors = match[1].split(',').map((part) => part.trim());
    if (!selectors.includes(selector)) continue;
    const propertyMatch = match[2].match(
      new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`)
    );
    if (!propertyMatch) {
      throw new Error(`Rule ${selector} không khai báo ${property}`);
    }
    return propertyMatch[1].trim();
  }
  throw new Error(`Thiếu rule ${selector} trong src/styles/tailwind.css`);
}

describe('Token popup SkyID (622×664) — đo 14/11/2026', () => {
  it('khung popup đúng 622×664, bo góc 10px', () => {
    expect(token('vj-popup-width')).toBe('622px');
    expect(token('vj-popup-height')).toBe('664px');
    expect(token('vj-popup-radius')).toBe('10px');
  });

  it('băng đỏ 48px, padding ngang 17px', () => {
    expect(token('vj-popup-header-height')).toBe('48px');
    expect(token('vj-popup-header-padding')).toBe('17px');
  });

  it('khung form SkyID 500×208', () => {
    expect(token('vj-popup-viewport-width')).toBe('500px');
    expect(token('vj-popup-viewport-height')).toBe('208px');
  });

  it('bottom nav 62px, bo góc trên 15px', () => {
    expect(token('vj-popup-nav-height')).toBe('62px');
    expect(token('vj-popup-nav-radius')).toBe('15px');
  });

  it('gradient băng đỏ khớp site thật', () => {
    const gradient = token('vj-popup-header-gradient').replace(/\s+/g, '');
    expect(gradient).toBe(
      'linear-gradient(rgb(217,26,33)34.8%,rgb(171,3,3)182.34%)'
    );
  });
});

describe('Header trang con (74px) — đo 14/11/2026', () => {
  it('nav cao 72px + viền dưới 2px = 74px tổng cả', () => {
    const navHeight = ruleValue('.vj-subheader-nav', 'height');
    const border = ruleValue('.vj-subheader', 'border-bottom');
    expect(navHeight).toBe('72px');
    expect(border).toContain('2px');
  });

  it('nền trắng, bo góc dưới 16px, viền đỏ', () => {
    expect(ruleValue('.vj-subheader', 'border-radius')).toBe('0 0 16px 16px');
    expect(ruleValue('.vj-subheader', 'background-color')).toContain('var(--vj-header-sub)');
  });

  it('chip 28px bo tròn 999px, pill 36px', () => {
    expect(ruleValue('.vj-subheader-chip', 'height')).toBe('28px');
    expect(ruleValue('.vj-subheader-chip', 'border-radius')).toBe('999px');
    expect(ruleValue('.vj-subheader-pill', 'height')).toBe('36px');
  });
});

describe('Ô nhập tra cứu (underline MUI 40px) — đo 14/11/2026', () => {
  it('wrapper cao 40px', () => {
    expect(ruleValue('.vj-lookup-field', 'height')).toBe('40px');
  });

  it('input cao 32px, padding 6px 0 7px, gạch chân 1px', () => {
    expect(ruleValue('.vj-lookup-field .vj-lookup-input', 'height')).toBe('32px');
    expect(ruleValue('.vj-lookup-field .vj-lookup-input', 'padding')).toBe('6px 0 7px');
    expect(ruleValue('.vj-lookup-field .vj-lookup-input', 'border-bottom')).toContain('1px solid');
  });

  it('focus đổi gạch chân thành 2px đỏ thương hiệu', () => {
    expect(ruleValue('.vj-lookup-field .vj-lookup-input:focus', 'border-bottom')).toContain('2px solid');
  });
});

describe('Nút hành động — đo 14/11/2026', () => {
  it('"Tìm kiếm" 127×39, bo góc 10px, chữ 14px/500', () => {
    expect(ruleValue('.vj-lookup-btn', 'width')).toBe('127px');
    expect(ruleValue('.vj-lookup-btn', 'height')).toBe('39px');
    expect(ruleValue('.vj-lookup-btn', 'border-radius')).toBe('10px');
    expect(ruleValue('.vj-lookup-btn', 'font-size')).toBe('14px');
    expect(ruleValue('.vj-lookup-btn', 'font-weight')).toBe('500');
  });

  it('"Đăng nhập" cao 48px, bo góc 12px', () => {
    expect(ruleValue('.vj-skyjoy-login-btn', 'height')).toBe('48px');
    expect(ruleValue('.vj-skyjoy-login-btn', 'border-radius')).toBe('var(--vj-radius-card)');
    expect(token('vj-radius-card')).toBe('12px');
  });

  it('"Đăng ký ngay" 14px/400 màu rgb(0,136,255)', () => {
    expect(ruleValue('.vj-skyjoy-register-link', 'font-size')).toBe('14px');
    expect(ruleValue('.vj-skyjoy-register-link', 'font-weight')).toBe('400');
    expect(ruleValue('.vj-skyjoy-register-link', 'color')).toBe('rgb(0, 136, 255)');
  });
});

describe('Pill tab "Dịch vụ tra cứu" — đo 14/11/2026', () => {
  it('pill 164×36 bo góc 18px', () => {
    expect(ruleValue('.vj-pill-tabs .vj-pill-tab', 'min-width')).toBe('164px');
    expect(ruleValue('.vj-pill-tab', 'height')).toBe('36px');
    expect(ruleValue('.vj-pill-tab', 'border-radius')).toBe('18px');
  });

  it('tab active nền #FFDD32, chữ rgb(115,62,10)', () => {
    expect(token('vj-yellow-tab')).toBe('#ffdd32');
    expect(token('vj-tab-ink')).toBe('#733e0a');
  });

  it('dải pill bo góc 16px, padding 16px', () => {
    expect(ruleValue('.vj-pill-tabs', 'border-radius')).toBe('var(--vj-pill-strip-radius)');
    expect(token('vj-pill-strip-radius')).toBe('16px');
    expect(ruleValue('.vj-pill-tabs', 'padding')).toBe('16px');
  });
});
