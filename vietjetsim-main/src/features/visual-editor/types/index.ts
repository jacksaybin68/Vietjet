/**
 * Kiểu dữ liệu cho trình soạn thảo trực quan.
 *
 * Bố cục trang KHÔNG phải HTML tự do. Nó là một danh sách section đã được
 * định danh, mỗi section có thứ tự, trạng thái hiển thị, và một tập style
 * đã giới hạn trong allow-list. Nhờ vậy:
 *   * không có đường để lưu HTML do người dùng nhập (không có stored XSS);
 *   * trang chủ vẫn render component React gốc nên không mất hành vi
 *     (đặt vé, carousel, v.v.) và không phá vỡ các phép đo đối chiếu.
 */

/** Các section của trang chủ mà trình soạn thảo được phép sắp xếp. */
export type HomepageSectionId =
  | 'hero'
  | 'service-strip'
  | 'swift-cargo'
  | 'deals'
  | 'destinations'
  | 'shopping';

/** Các trang hiện hỗ trợ soạn thảo trực quan. */
export type SupportedPagePath = '/trang-chu';

/**
 * Style áp dụng cho một section.
 *
 * Mỗi thuộc tính đều là tùy chọn: thiếu nghĩa là "giữ nguyên như mặc định
 * của trang", tức trình soạn thảo không ghi đè style gốc của component.
 */
export interface SectionStyle {
  /** Padding trên, tính bằng px. */
  paddingTop?: number;
  /** Padding dưới, tính bằng px. */
  paddingBottom?: number;
  /** Màu nền (hex/rgb/hsl đã được kiểm tra ở server). */
  backgroundColor?: string;
  /** Chiều rộng tối đa của vùng nội dung, tính bằng px. */
  maxWidth?: number;
  /** Ẩn hoàn toàn section này khỏi trang. */
  hidden?: boolean;
}

/** Một section trong bố cục trang. */
export interface PageSection {
  id: HomepageSectionId;
  /** Section có hiển thị trên trang không. */
  visible: boolean;
  style: SectionStyle;
}

/** Bố cục của một trang. */
export interface PageLayout {
  version: 1;
  sections: PageSection[];
}

/**
 * Danh mục section hiển thị trong khung bên trái của trình soạn thảo.
 * Thứ tự ở đây là thứ tự mặc định của trang chủ.
 */
export interface SectionCatalogEntry {
  id: HomepageSectionId;
  /** Nhãn tiếng Việt hiển thị cho người vận hành. */
  label: string;
  /** Mô tả ngắn giúp người vận hành biết section này là gì. */
  description: string;
}

export const HOMEPAGE_SECTION_CATALOG: readonly SectionCatalogEntry[] = [
  {
    id: 'hero',
    label: 'Banner chính',
    description: 'Ảnh nền + khung đặt vé nhanh',
  },
  {
    id: 'service-strip',
    label: 'Dải dịch vụ',
    description: '4 thẻ dịch vụ (hành lý, check-in, đổi vé…)',
  },
  {
    id: 'swift-cargo',
    label: 'Swift Cargo',
    description: 'Ưu đãi vận chuyển hàng hóa nhanh',
  },
  {
    id: 'deals',
    label: 'Giá tốt mỗi ngày',
    description: 'Băng chuyền giá ưu đãi theo ngày',
  },
  {
    id: 'destinations',
    label: 'Điểm đến hấp dẫn',
    description: 'Lưới điểm đến nổi bật',
  },
  {
    id: 'shopping',
    label: 'Mua sắm trực tuyến',
    description: 'Sản phẩm Vietjet phụ kiện',
  },
];

/**
 * Bố cục mặc định của trang chủ — đúng thứ tự component hiện tại.
 * Dùng làm fallback khi chưa có bố cục nào được lưu.
 */
export function buildDefaultLayout(): PageLayout {
  return {
    version: 1,
    sections: HOMEPAGE_SECTION_CATALOG.map((entry) => ({
      id: entry.id,
      visible: true,
      style: {},
    })),
  };
}
