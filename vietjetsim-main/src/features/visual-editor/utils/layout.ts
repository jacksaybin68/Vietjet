import type { PageLayout, PageSection, SectionStyle } from '../types';

/**
 * Làm sạch style của một section.
 *
 * Allow-list là ở đây, không phải ở component render: mọi giá trị đi qua
 * hàm này trước khi được lưu (server) và trước khi được áp dụng (client).
 * Vì vậy một bố cục tùy ý chỉ có thể tác động tới padding, màu nền và
 * chiều rộng — không thể chèn `position: fixed`, `z-index` hay script.
 */

/** Màu hợp lệ: hex 3/6/8 chữ số, rgb(), rgba(), hsl(), hsla(). */
const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/;

/** Giá trị px hợp lệ cho padding / max-width. */
const LENGTH_PATTERN = /^\d{1,5}$/;

/** Padding không vượt quá 400px — quá lớn sẽ phá vỡ bố cục trang. */
const MAX_LENGTH_PX = 400;

/** max-width không vượt quá 2400px (rộng hơn màn hình lớn nhất phổ biến). */
const MAX_WIDTH_PX = 2400;

/** Thứ tự section mặc định của trang chủ. */
const HOMEPAGE_SECTION_ORDER = [
  'hero',
  'service-strip',
  'swift-cargo',
  'deals',
  'destinations',
  'shopping',
] as const;

export const DEFAULT_SECTION_STYLE: SectionStyle = {};

/**
 * Chuẩn hoá một style tùy ý về style an toàn.
 *
 * Giá trị sai bị **loại bỏ** chứ không ném lỗi: người vận hành có thể đang
 * sửa một bố cục cũ trong khi schema đã đổi, và việc render bố cục với
 * phần style bị loại bỏ vẫn tốt hơn là trả 500 cho cả trang.
 */
export function sanitizeSectionStyle(input: unknown): SectionStyle {
  if (!input || typeof input !== 'object') return { ...DEFAULT_SECTION_STYLE };

  const source = input as Record<string, unknown>;
  const style: SectionStyle = {};

  const readLength = (key: 'paddingTop' | 'paddingBottom' | 'maxWidth'): number | undefined => {
    const raw = source[key];
    if (typeof raw === 'number') {
      return Number.isFinite(raw) && raw >= 0 && raw <= MAX_WIDTH_PX
        ? Math.round(raw)
        : undefined;
    }
    if (typeof raw === 'string' && LENGTH_PATTERN.test(raw.trim())) {
      const value = Number.parseInt(raw.trim(), 10);
      return value >= 0 && value <= MAX_WIDTH_PX ? value : undefined;
    }
    return undefined;
  };

  const paddingTop = readLength('paddingTop');
  if (typeof paddingTop === 'number') style.paddingTop = paddingTop;

  const paddingBottom = readLength('paddingBottom');
  if (typeof paddingBottom === 'number') style.paddingBottom = paddingBottom;

  const maxWidth = readLength('maxWidth');
  if (typeof maxWidth === 'number') style.maxWidth = maxWidth;

  const backgroundColor = source.backgroundColor;
  if (
    typeof backgroundColor === 'string' &&
    backgroundColor.length <= 64 &&
    COLOR_PATTERN.test(backgroundColor.trim())
  ) {
    style.backgroundColor = backgroundColor.trim();
  }

  if (source.hidden === true) style.hidden = true;

  return style;
}

/**
 * Chuẩn hoá một bố cục tùy ý (từ DB hoặc từ request) về `PageLayout` hợp lệ.
 *
 * - Section lạ bị loại bỏ (id không nằm trong danh mục).
 * - Section thiếu được chèn lại theo thứ tự mặc định, nên một bố cục lưu
 *   từ lâu vẫn đủ section khi trang chủ bổ sung section mới.
 * - `visible` mặc định là `true`; `style` luôn là object.
 */
export function normalizeLayout(input: unknown): PageLayout {
  const validIds = new Set<string>(HOMEPAGE_SECTION_ORDER);

  const source =
    input && typeof input === 'object' && Array.isArray((input as { sections?: unknown }).sections)
      ? (input as { sections: unknown[] }).sections
      : [];

  const byId = new Map<string, PageSection>();
  for (const raw of source) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const id = record.id;
    if (typeof id !== 'string' || !validIds.has(id)) continue;
    if (byId.has(id)) continue;

    byId.set(id, {
      id: id as PageSection['id'],
      visible: record.visible !== false,
      style: sanitizeSectionStyle(record.style),
    });
  }

  // Giữ thứ tự đã lưu, nhưng chèn các section thiếu theo thứ tự mặc định.
  const ordered: PageSection[] = [];
  const seen = new Set<string>();
  for (const section of byId.values()) {
    ordered.push(section);
    seen.add(section.id);
  }
  for (const id of HOMEPAGE_SECTION_ORDER) {
    if (!seen.has(id)) {
      ordered.push({ id, visible: true, style: {} });
    }
  }

  return { version: 1, sections: ordered };
}

/** Bố cục mặc định cho một trang. */
export function defaultLayoutFor(pagePath: string): PageLayout {
  void pagePath;
  return {
    version: 1,
    sections: HOMEPAGE_SECTION_ORDER.map((id) => ({ id, visible: true, style: {} })),
  };
}

/**
 * Thứ tự các section **đang hiển thị** của một bố cục.
 *
 * Trả `null` khi chưa có bố cục nào được lưu — tín hiệu cho phía render
 * biết phải dùng thứ tự mặc định của trang thay vì một danh sách rỗng
 * (bố cục rỗng có nghĩa là "ẩn hết", khác hẳn "chưa cấu hình").
 */
export function visibleSectionIds(layout: PageLayout | null | undefined): string[] | null {
  if (!layout || !Array.isArray(layout.sections)) return null;

  const ids = layout.sections
    .filter((section) => section.visible !== false)
    .map((section) => section.id);

  // Một bố cục hợp lệ luôn có ít nhất một section hiển thị sau khi
  // `normalizeLayout` chạy, nhưng dữ liệu gốc trong DB có thể không.
  return ids.length > 0 ? ids : null;
}

/** Style của một section trong bố cục (rỗng nếu không có bố cục). */
export function sectionStyleFor(
  layout: PageLayout | null | undefined,
  sectionId: string
): SectionStyle {
  if (!layout || !Array.isArray(layout.sections)) return { ...DEFAULT_SECTION_STYLE };

  const found = layout.sections.find((section) => section.id === sectionId);
  return found ? found.style : { ...DEFAULT_SECTION_STYLE };
}
