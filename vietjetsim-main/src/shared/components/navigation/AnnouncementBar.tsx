'use client';

import { useEffect, useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { RiArrowLeftSLine, RiArrowRightSLine, RiNotification3Line } from 'react-icons/ri';
import { apiRequest } from '@/shared/services';

/**
 * Thanh thông báo nằm ngay trên `<Header>` (nền trắng, cao 58–60px trên
 * desktop). Chuông đỏ ở bên trái, nội dung căn giữa theo chiều dọc, và cụm điều
 * hướng ngay bên phải: lùi / tiến giữa các thông báo rồi nút đóng X.
 *
 * Nội dung dài luôn nằm gọn trong một dòng (`truncate`) với `min-w-0 flex-1`,
 * nên một thông báo dài không thể đẩy cụm nút ra khỏi khung hay làm vỡ bố cục;
 * nội dung đầy đủ vẫn đọc được qua `title` khi rê chuột.
 *
 * Nguồn nội dung là `/api/cong-khai/thong-bao` — các thông báo quản trị viên đã
 * phát hành cho mọi khách (`announcements`, lọc `is_active`, khoảng hiệu lực và
 * `target_role = 'all'`). Thanh này render ngay từ HTML đầu tiên nên trước khi
 * request xong (và khi database chưa có thông báo nào được phát hành) nó dùng
 * `FALLBACK_ANNOUNCEMENTS` bên dưới. Lỗi mạng cũng rơi vào đó: mất một thông báo
 * mới không phải lý do để thanh trống.
 */
const FALLBACK_ANNOUNCEMENTS: readonly string[] = [
  'Ưu đãi 50% cho vé khứ hồi nội địa — đặt ngay hôm nay!',
  'Thành viên SkyJoy tích điểm gấp đôi khi đặt vé trên website và ứng dụng Vietjet.',
  'Vietjet mở bán đường bay mới TP. Hồ Chí Minh – Western Sydney (WSI), giá chỉ từ 299.000đ.',
  'Từ 15/10/2026, Vietjet bổ sung 12 chuyến bay mỗi tuần trên đường bay TP. Hồ Chí Minh – Hà Nội và điều chỉnh giờ khởi hành một số chuyến buổi tối; vui lòng kiểm tra lại thông tin chuyến bay trước khi ra sân bay.',
];

/** Thông báo như `/api/cong-khai/thong-bao` trả về. */
interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
}

/**
 * Một dòng của thanh. Quản trị viên điền cả `title` (nhãn ngắn) lẫn `content`
 * (nội dung), nên ghép hai phần thay vì bỏ mất một phần; khi hai phần trùng nhau
 * hoặc thiếu một phần thì in phần còn lại.
 */
function toBarLine(announcement: PublicAnnouncement): string {
  const title = announcement.title?.trim();
  const content = announcement.content?.trim();
  if (title && content && title !== content) return `${title} — ${content}`;
  return title || content || '';
}

export default function AnnouncementBar() {
  const [messages, setMessages] = useState<readonly string[]>(FALLBACK_ANNOUNCEMENTS);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await apiRequest<{ announcements?: PublicAnnouncement[] }>(
          '/api/cong-khai/thong-bao'
        );
        const lines = (data.announcements ?? []).map(toBarLine).filter((line) => line.length > 0);
        if (!cancelled && lines.length > 0) {
          setMessages(lines);
          setIndex(0);
        }
      } catch {
        // Giữ nội dung mẫu đang hiển thị.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed) return null;

  const total = messages.length;
  if (total === 0) return null;

  const message = messages[index] ?? messages[0];
  const move = (step: number) => setIndex((current) => (current + step + total) % total);

  const controlClass =
    'grid h-8 w-8 place-items-center rounded-full text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--primary)]';

  return (
    <div
      role="region"
      aria-label="Thông báo"
      className="border-b border-black/5 bg-[var(--background)]"
    >
      <div className="mx-auto flex h-[58px] max-w-[1240px] items-center gap-3 px-4 sm:h-[60px]">
        <RiNotification3Line
          aria-hidden="true"
          className="shrink-0 text-[22px] text-[var(--primary)] sm:text-2xl"
        />

        <p
          aria-live="polite"
          title={message}
          className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-6 text-[var(--foreground)] sm:text-[17px] lg:text-[19px]"
        >
          {message}
        </p>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Thông báo trước"
            className={controlClass}
          >
            <RiArrowLeftSLine aria-hidden="true" className="text-xl" />
          </button>
          <span className="min-w-[38px] text-center text-xs font-bold tabular-nums text-[var(--foreground-muted)]">
            {index + 1}/{total}
          </span>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Thông báo tiếp theo"
            className={controlClass}
          >
            <RiArrowRightSLine aria-hidden="true" className="text-xl" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Đóng thông báo"
            className={`${controlClass} ml-1`}
          >
            <HiOutlineX aria-hidden="true" className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
