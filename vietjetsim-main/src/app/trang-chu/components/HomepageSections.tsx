'use client';

import { useEffect, useState } from 'react';
import {
  fetchPublicPageLayout,
  normalizeLayout,
  sectionStyleFor,
  visibleSectionIds,
} from '@/features/visual-editor';
import type { PageLayout, SectionStyle } from '@/features/visual-editor/types';

/**
 * Áp dụng bố cục đã lưu lên trang chủ.
 *
 * Trình soạn thảo trực quan (`/editor`) **không** ghi đè HTML của trang: nó
 * lưu thứ tự section và các điều chỉnh style đã chọn, và lớp này áp dụng
 * chúng lên các component React gốc. Nhờ vậy các phép đo giao diện đã đối
 * chiếu với vietjetair.com vẫn còn hiệu lực — đổi bố cục không biến trang
 * chủ thành HTML sinh ra không kiểm duyệt.
 *
 * Vì sao đọc bố cục ở client chứ không đọc thẳng từ DB trong server component:
 * trang chủ được prerender tĩnh, và đọc DB lúc build sẽ **đóng băng** bố cục
 * vào bản build — một lần sửa bố cục sẽ không lên trang cho tới lần build
 * kế tiếp. Đọc ở client giữ trang tĩnh và bố cục luôn là bản mới nhất.
 *
 * Khi chưa có bố cục nào được lưu (hoặc API lỗi), `visibleSectionIds` trả
 * `null` và lớp này render đúng thứ tự gốc — trang chủ vẫn ra đúng.
 */

const PAGE_PATH = '/trang-chu';

interface HomepageSectionsProps {
  hero: React.ReactNode;
  serviceStrip: React.ReactNode;
  swiftCargo: React.ReactNode;
  deals: React.ReactNode;
  destinations: React.ReactNode;
  shopping: React.ReactNode;
}

/** Thứ tự section mặc định — dùng khi chưa có bố cục nào được lưu. */
const DEFAULT_ORDER = [
  'hero',
  'service-strip',
  'swift-cargo',
  'deals',
  'destinations',
  'shopping',
] as const;

export default function HomepageSections({
  hero,
  serviceStrip,
  swiftCargo,
  deals,
  destinations,
  shopping,
}: HomepageSectionsProps) {
  const [layout, setLayout] = useState<PageLayout | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPublicPageLayout(PAGE_PATH)
      .then((response) => {
        if (cancelled) return;
        setLayout(response?.layout ? normalizeLayout(response.layout) : null);
      })
      .catch(() => {
        // API lỗi không được làm hỏng trang chủ — dùng thứ tự mặc định.
        if (!cancelled) setLayout(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const byId: Record<string, React.ReactNode> = {
    hero,
    'service-strip': serviceStrip,
    'swift-cargo': swiftCargo,
    deals,
    destinations,
    shopping,
  };

  const order = visibleSectionIds(layout) ?? [...DEFAULT_ORDER];

  return (
    <>
      {order.map((id) => {
        const node = byId[id];
        if (!node) return null;

        const style = sectionStyleFor(layout, id);
        return (
          <SectionFrame key={id} style={style}>
            {node}
          </SectionFrame>
        );
      })}
    </>
  );
}

/**
 * Bọc một section để áp dụng style đã lưu.
 *
 * Chỉ các thuộc tính trong allow-list của `sanitizeSectionStyle` được áp
 * dụng — `position`, `z-index` và mọi thứ khác không có đường vào đây, nên
 * một layout tùy ý không thể phá bố cục của cả trang.
 */
function SectionFrame({
  style,
  children,
}: {
  style: SectionStyle;
  children: React.ReactNode;
}) {
  if (style.hidden) return null;

  const css: React.CSSProperties = {};
  if (typeof style.paddingTop === 'number') css.paddingTop = `${style.paddingTop}px`;
  if (typeof style.paddingBottom === 'number') css.paddingBottom = `${style.paddingBottom}px`;
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (typeof style.maxWidth === 'number') {
    css.maxWidth = `${style.maxWidth}px`;
    css.marginLeft = 'auto';
    css.marginRight = 'auto';
  }

  if (Object.keys(css).length === 0) return <>{children}</>;

  return <div style={css}>{children}</div>;
}
