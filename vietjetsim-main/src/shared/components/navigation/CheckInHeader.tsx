'use client';

import SubpageHeader from './SubpageHeader';

/**
 * Header cho trang Check-in.
 *
 * Số đo lấy từ DOM sống của vietjetair.com (13/11/2026, 1440×900):
 *   - Header TRẮNG 74px: nền `#FFFFFF`, viền dưới 2px `#E31E24`, bo góc
 *     dưới 16px, shadow `rgba(0,0,0,0.08) 0 8px 24px`.
 *   - Nội dung trang bắt đầu NGAY dưới header (y=77, container 1200px).
 *
 * Ở MOBILE site thật dùng băng đỏ toàn chiều rộng với `H1` trắng `16px/700`
 * uppercase (`LÀM THỦ TỤC`) — nên `mobileRed` mặc định bật.
 *
 * Trước đây trang này dùng 1 thanh đỏ gradient 70px — không khớp site thật.
 * Nay dùng chung `SubpageHeader` với các trang con khác.
 */
export default function CheckInHeader({
  title = 'ONLINE CHECK-IN',
  mobileRed = true,
}: {
  title?: string;
  mobileRed?: boolean;
}) {
  return <SubpageHeader title={title} mobileRed={mobileRed} />;
}
