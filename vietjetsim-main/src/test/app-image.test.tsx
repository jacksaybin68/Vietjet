/**
 * `AppImage` là component ảnh dùng chung, và `src` rỗng từng lọt tới `<img>`.
 *
 * `UserDashboardClient` truyền `src={booking.image || ''}` cho thẻ chuyến bay sắp
 * tới, nên mỗi vé không có ảnh khiến trình duyệt coi `src=""` là URL tài liệu và
 * tải lại cả trang như một ảnh (React cảnh báo đúng điều này), rồi ảnh mặc định
 * mới xuất hiện nhờ `onError` — sau một request thừa. Test này ghim cả hàm thuần
 * lẫn phần render.
 */

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AppImage, { resolveImageSrc } from '@/shared/components/ui/AppImage';

const FALLBACK = '/assets/images/no_image.png';

describe('AppImage', () => {
  it('thay src rỗng bằng ảnh mặc định thay vì để trình duyệt tự đoán', () => {
    expect(resolveImageSrc('', FALLBACK)).toBe(FALLBACK);
    expect(resolveImageSrc('   ', FALLBACK)).toBe(FALLBACK);
    expect(resolveImageSrc(undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveImageSrc(null, FALLBACK)).toBe(FALLBACK);
  });

  it('giữ nguyên src hợp lệ', () => {
    expect(resolveImageSrc('/assets/images/chat-avatar.jpg', FALLBACK)).toBe(
      '/assets/images/chat-avatar.jpg'
    );
    expect(resolveImageSrc('https://cdn.example.com/a.png', FALLBACK)).toBe(
      'https://cdn.example.com/a.png'
    );
  });

  it('không render <img> với src rỗng khi caller truyền chuỗi rỗng', () => {
    const { container } = render(<AppImage src="" alt="Đà Nẵng" />);
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    const src = img?.getAttribute('src') ?? '';
    // next/image có thể bọc qua loader nội bộ, nên khớp tên file thay vì cả URL.
    expect(src).not.toBe('');
    expect(decodeURIComponent(src)).toContain('no_image.png');
  });
});
