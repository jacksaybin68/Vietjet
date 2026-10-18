'use client';

import { useState } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import { RiArrowLeftSLine, RiArrowRightSLine, RiNotification3Line } from 'react-icons/ri';

/**
 * Thanh thông báo nằm ngay trên `<Header>` (nền trắng, cao 58–60px trên
 * desktop). Cùng một chuông đỏ ở bên trái, nội dung căn giữa theo chiều dọc,
 * và cụm điều hướng ngay bên phải: lùi / tiến giữa các thông báo rồi nút đóng X.
 *
 * Nội dung dài luôn nằm gọn trong một dòng (`truncate`) với `min-w-0 flex-1`,
 * nên một thông báo dài không thể đẩy cụm nút ra khỏi khung hay làm vỡ bố cục;
 * tiêu đề đầy đủ vẫn đọc được qua `title` khi rê chuột.
 *
 * Danh sách là nội dung biên tập tĩnh: bảng `announcements` + `/quan-tri` →
 * "Thông báo" chỉ dành cho quản trị viên, nên thanh công khai này không đọc
 * thẳng từ đó. Khi cần đổi nội dung, sửa `ANNOUNCEMENTS` bên dưới.
 */
const ANNOUNCEMENTS: readonly string[] = [
  'Ưu đãi 50% cho vé khứ hồi nội địa — đặt ngay hôm nay!',
  'Thành viên SkyJoy tích điểm gấp đôi khi đặt vé trên website và ứng dụng Vietjet.',
  'Vietjet mở bán đường bay mới TP. Hồ Chí Minh – Western Sydney (WSI), giá chỉ từ 299.000đ.',
  'Từ 15/10/2026, Vietjet bổ sung 12 chuyến bay mỗi tuần trên đường bay TP. Hồ Chí Minh – Hà Nội và điều chỉnh giờ khởi hành một số chuyến buổi tối; vui lòng kiểm tra lại thông tin chuyến bay trước khi ra sân bay.',
];

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const total = ANNOUNCEMENTS.length;
  const message = ANNOUNCEMENTS[index];
  const move = (step: number) => setIndex((current) => (current + step + total) % total);

  const controlClass =
    'grid h-8 w-8 place-items-center rounded-full text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--primary)]';

  return (
    <div role="region" aria-label="Thông báo" className="border-b border-black/5 bg-white">
      <div className="mx-auto flex h-[58px] max-w-[1240px] items-center gap-3 px-4 sm:h-[60px]">
        <RiNotification3Line
          aria-hidden="true"
          className="shrink-0 text-[22px] text-vjred sm:text-2xl"
        />

        <p
          aria-live="polite"
          title={message}
          className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-6 text-black sm:text-[17px] lg:text-[19px]"
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
