import React from 'react';
import Link from 'next/link';
import {
  RiFacebookFill,
  RiInstagramLine,
  RiTwitterXFill,
  RiYoutubeFill,
  RiRadarLine,
  RiFolderShield2Line,
} from 'react-icons/ri';
import { SiLine, SiZalo, SiApple, SiGoogleplay } from 'react-icons/si';
import {
  FlightPlaneIcon,
  CreditCardPaymentIcon,
} from '@/shared/components/ui/RealisticServiceIcons';

/**
 * Footer của vietjetair.com (đo 13/11/2026, viewport 1440×900):
 *
 * - Nền TRẮNG `#FFFFFF` phủ pattern SVG (`footer-pattern.svg`, background-size
 *   300px cover), cao 905px.
 * - Container 1200px (x=120..1320), hàng cột bắt đầu ở y=3872 (padding-top 60px).
 * - Bố cục 5 CỘT, mỗi cột rộng 195px, cách nhau 98px (x = 120 / 367 / 613 /
 *   860 / 1106). Cột 3 và cột 4 chứa 2 khối tiêu đề xếp dọc.
 * - Tiêu đề cột: 18px/700 màu `#333333` (KHÔNG phải đỏ thương hiệu).
 * - Liên kết: 14px/500 màu `#333333`, line-height 22.4px.
 */
const FOOTER_COLUMNS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    title: 'Để có chuyến bay tốt đẹp',
    links: [
      ['Điều lệ vận chuyển', '/gioi-thieu#terms'],
      ['Điều kiện vé', '/gioi-thieu#fare-rules'],
      ['Phí và lệ phí', '/gioi-thieu#fees'],
      ['Giấy tờ tùy thân', '/gioi-thieu#documents'],
      ['Sân bay và nhà ga quốc tế', '/gioi-thieu#airports'],
      ['Quy định hành lý', '/hanh-ly'],
      ['Tìm kiếm hành lý', '/tra-cuu'],
      ['Hành lý tồn kho Quốc tế', '/hanh-ly#storage'],
      ['Thông tin nối chuyến', '/gioi-thieu#transit'],
      ['Kênh thanh toán', '/thanh-toan'],
      ['Hóa đơn VAT', '/tra-cuu#vat'],
      ['Hướng dẫn làm thủ tục chuyến bay', '/lam-thu-tuc'],
      ['Khuyến cáo di chuyển', '/gioi-thieu#travel-advisory'],
      ['Hướng dẫn về chuyến bay liên danh', '/gioi-thieu#codeshare'],
    ],
  },
  {
    title: 'Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa...',
    links: [
      ['Mua trước hành lý', '/dich-vu?service=baggage'],
      ['Chọn chỗ ngồi ưu tiên', '/dich-vu?service=seat'],
      ['Đặt trước suất ăn - Vikkafe', '/dich-vu?service=meal'],
      ['Hàng miễn thuế', '/dich-vu?service=dutyfree'],
      ['Quà lưu niệm', '/dich-vu?service=souvenir'],
      ['Giải trí', '/dich-vu?service=entertainment'],
      ['Dịch vụ vận chuyển thú cưng', '/dich-vu?service=pet'],
      ['Dịch vụ trẻ em đi một mình', '/dich-vu?service=unaccompanied-minor'],
      ['Dịch vụ hỗ trợ "Bay cùng bạn"', '/dich-vu?service=flywithyou'],
      ['Mua thêm chỗ ngồi bên cạnh', '/dich-vu?service=extra-seat'],
      ['Dịch vụ hàng hóa', '/dich-vu?service=cargo'],
    ],
  },
  {
    title: 'Dịch vụ cao cấp',
    links: [
      ['Hạng vé thương gia - Business', '/dich-vu?service=business'],
      ['Hạng vé Skyboss', '/dich-vu?service=skyboss'],
      ['Phòng chờ sang trọng', '/dich-vu?service=lounge'],
    ],
  },
  {
    title: 'Trung tâm phục vụ Khách hàng',
    links: [
      ['Hỗ trợ 1900 1166', '/hoi-dap'],
      ['Đặt vé qua tổng đài 1900 1886', '/lien-he'],
      ['Câu hỏi thường gặp', '/hoi-dap'],
    ],
  },
  {
    title: 'Mua vé ở đâu?',
    links: [
      ['Phòng bán vé', '/lien-he#ticket-offices'],
      ['Đại lý bán vé', '/lien-he#agencies'],
      ['Đăng ký khách hàng Doanh nghiệp', '/lien-he#corporate'],
      ['Đăng ký làm đại lý online', '/lien-he#agency-online'],
    ],
  },
] as const;

/** Cột 3 xếp thêm khối "Về Vietjet" bên dưới khối "Dịch vụ cao cấp". */
const ABOUT_LINKS: ReadonlyArray<readonly [string, string]> = [
  ['Giới thiệu công ty', '/gioi-thieu'],
  ['Nhà đầu tư', '/gioi-thieu#investors'],
  ['Cơ hội nghề nghiệp', '/gioi-thieu#careers'],
  ['Tin tức', '/gioi-thieu#news'],
  ['Khuyến mại', '/trang-chu#deals'],
  ['Cẩm nang du lịch', '/gioi-thieu#guide'],
  ['Quảng cáo cùng Vietjet', '/gioi-thieu#ads'],
];

/** Cột 5 — các liên kết chính sách (site thật: cột này không có tiêu đề). */
const POLICY_LINKS: ReadonlyArray<readonly [string, string]> = [
  ['Chính sách về quyền riêng tư', '/gioi-thieu#privacy'],
  ['Chính sách sử dụng Cookies', '/gioi-thieu#cookies'],
  ['Chính sách bảo vệ quyền lợi khách hàng dễ bị tổn thương', '/gioi-thieu#vulnerable-customers'],
  ['Chính sách ưu đãi cho người lớn tuổi, người khuyết tật', '/gioi-thieu#special-assistance'],
  ['Quy trình xử lý đổi, hoàn, hủy vé', '/gioi-thieu#refund-policy'],
  ['Vietjet e-Voucher', '/dich-vu?service=evoucher'],
  ['Phiếu yêu cầu trực tuyến (e-Forms)', '/lien-he#eforms'],
  ['Bản đồ sân bay', '/dich-vu#san-bay'],
  ['Bản đồ đường bay', '/dich-vu#duong-bay'],
  ['Săn vé giá rẻ', '/trang-chu#deals'],
];

export default function Footer() {
  return (
    // Nền trắng phủ pattern SVG (đo được trên site thật: background-color #fff
    // + footer-pattern.svg, background-size 300px cover).
    <footer className="vj-footer-sky relative overflow-hidden text-xs">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 pt-[60px] sm:px-6 lg:px-0">
        {/* 5 cột — mỗi cột rộng 195px, cách nhau 98px. */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-[24px]">
          {/* Cột 1 — Để có chuyến bay tốt đẹp. */}
          <div>
            <h3 className="vj-footer-heading mb-3">{FOOTER_COLUMNS[0].title}</h3>
            <ul className="space-y-1.5">
              {FOOTER_COLUMNS[0].links.map(([title, href]) => (
                <li key={`${FOOTER_COLUMNS[0].title}-${title}`}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 2 — Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa... */}
          <div>
            <h3 className="vj-footer-heading mb-3">{FOOTER_COLUMNS[1].title}</h3>
            <ul className="space-y-1.5">
              {FOOTER_COLUMNS[1].links.map(([title, href]) => (
                <li key={`${FOOTER_COLUMNS[1].title}-${title}`}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3 — Dịch vụ cao cấp + Về Vietjet. */}
          <div>
            <h3 className="vj-footer-heading mb-3">{FOOTER_COLUMNS[2].title}</h3>
            <ul className="space-y-1.5">
              {FOOTER_COLUMNS[2].links.map(([title, href]) => (
                <li key={`${FOOTER_COLUMNS[2].title}-${title}`}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="vj-footer-heading mb-3 mt-8">Về Vietjet</h3>
            <ul className="space-y-1.5">
              {ABOUT_LINKS.map(([title, href]) => (
                <li key={title}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 4 — Trung tâm phục vụ Khách hàng + Mua vé ở đâu? */}
          <div>
            <h3 className="vj-footer-heading mb-3">{FOOTER_COLUMNS[3].title}</h3>
            <ul className="space-y-1.5">
              {FOOTER_COLUMNS[3].links.map(([title, href]) => (
                <li key={`${FOOTER_COLUMNS[3].title}-${title}`}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="vj-footer-heading mb-3 mt-8">{FOOTER_COLUMNS[4].title}</h3>
            <ul className="space-y-1.5">
              {FOOTER_COLUMNS[4].links.map(([title, href]) => (
                <li key={`${FOOTER_COLUMNS[4].title}-${title}`}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 5 — Chính sách & bản đồ (site thật: cột này không có tiêu đề). */}
          <div>
            <ul className="space-y-1.5">
              {POLICY_LINKS.map(([title, href]) => (
                <li key={title}>
                  <Link href={href} className="vj-footer-link">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kết nối với Vietjet + ứng dụng di động + thông tin pháp nhân.
            Site thật: hàng này nằm ở y=4398, cao 181px, container 1200px. */}
        <div className="mt-10 grid grid-cols-1 gap-8 border-t border-[var(--border)] pt-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="vj-footer-heading mb-3">Kết nối với Vietjet</h3>
            <div className="flex items-center gap-2">
              {[
                {
                  href: 'https://facebook.com/vietjetvietnam',
                  label: 'Facebook',
                  icon: <RiFacebookFill size={16} />,
                  className: 'bg-social-facebook',
                },
                {
                  href: 'https://instagram.com/vietjet',
                  label: 'Instagram',
                  icon: <RiInstagramLine size={16} />,
                  className: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
                },
                {
                  href: 'https://twitter.com/vietjetvietnam',
                  label: 'X (Twitter)',
                  icon: <RiTwitterXFill size={14} />,
                  className: 'bg-black',
                },
                {
                  href: 'https://line.me/R/ti/p/@vietjet',
                  label: 'LINE',
                  icon: <SiLine size={16} />,
                  className: 'bg-social-line',
                },
                {
                  href: 'https://zalo.me/vietjet',
                  label: 'Zalo',
                  icon: <SiZalo size={16} />,
                  className: 'bg-social-zalo',
                },
                {
                  href: 'https://youtube.com/vietjet',
                  label: 'YouTube',
                  icon: <RiYoutubeFill size={16} />,
                  className: 'bg-social-youtube',
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`w-7 h-7 rounded text-white flex items-center justify-center hover:opacity-90 transition-opacity ${social.className}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>

            <div className="mt-4">
              <p className="mb-2 font-bold text-[var(--foreground)]">
                Tải ứng dụng di động Vietjet Air
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <SiApple size={16} />
                  <div className="leading-tight text-left">
                    <span className="block text-4xs uppercase tracking-wider text-gray-300">
                      Available on the
                    </span>
                    <span className="block text-xs2 font-bold">App Store</span>
                  </div>
                </a>
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-black text-white px-2.5 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <SiGoogleplay size={14} className="text-emerald-400" />
                  <div className="leading-tight text-left">
                    <span className="block text-4xs uppercase tracking-wider text-gray-300">
                      GET IT ON
                    </span>
                    <span className="block text-xs2 font-bold">Google Play</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Thông tin pháp nhân + hướng dẫn. */}
          <div className="space-y-2 text-xs2 leading-relaxed text-[var(--foreground-muted)]">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/hoi-dap#dat-ve"
                className="flex items-center gap-1.5 font-bold text-[var(--foreground)] hover:text-primary-dark transition-colors"
              >
                <span className="w-5 h-5 rounded border border-primary-dark flex items-center justify-center p-0.5">
                  <FlightPlaneIcon size={14} />
                </span>
                <span>Hướng dẫn đặt chuyến bay</span>
              </Link>
              <Link
                href="/hoi-dap#thanh-toan"
                className="flex items-center gap-1.5 font-bold text-[var(--foreground)] hover:text-primary-dark transition-colors"
              >
                <CreditCardPaymentIcon size={20} className="shrink-0" />
                <span>Hướng dẫn thanh toán</span>
              </Link>
            </div>

            <p className="flex items-center gap-1.5 pt-1">
              <span>Cập nhật thông tin chuyến bay Flightradar</span>
              <span className="w-5 h-5 rounded-full border border-sky-400 text-sky-500 flex items-center justify-center">
                <RiRadarLine size={12} />
              </span>
            </p>

            <p className="font-black text-[var(--foreground)]">
              CÔNG TY CỔ PHẦN HÀNG KHÔNG VIETJET
            </p>
            <p>302/3 Phố Kim Mã, Phường Ngọc Hà, TP. Hà Nội, Việt Nam.</p>
            <p>Chịu trách nhiệm nội dung: Ông Nguyễn Thanh Sơn</p>
            <div className="pt-1 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 border border-sky-600 bg-sky-50 text-sky-800 px-2 py-0.5 rounded text-2xs font-bold">
                <RiFolderShield2Line size={13} className="text-sky-600" />
                <span>ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
