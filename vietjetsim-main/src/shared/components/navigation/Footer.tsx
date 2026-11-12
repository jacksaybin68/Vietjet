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
 * Footer của vietjetair.com (đo 13/11/2026, viewport 1440px):
 * nền xanh trời #0894A3 với một lớp gradient trắng ở mép trên, bên trong là
 * một thẻ trắng rộng 1328px, bo góc 40px, padding 50px 48px 40px. Sáu cột
 * liên kết, tiêu đề cột 18px/700 màu đỏ thương hiệu, liên kết 16px.
 */
const FOOTER_COLUMNS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    title: 'Quy định',
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
    title: 'Chính sách',
    links: [
      ['Tìm vật phẩm bỏ quên', '/tra-cuu#lost-found'],
      ['Chính sách về quyền riêng tư', '/gioi-thieu#privacy'],
      ['Chính sách sử dụng Cookies', '/gioi-thieu#cookies'],
      [
        'Chính sách bảo vệ quyền lợi khách hàng dễ bị tổn thương',
        '/gioi-thieu#vulnerable-customers',
      ],
      ['Chính sách ưu đãi cho người lớn tuổi, người khuyết tật', '/gioi-thieu#special-assistance'],
      ['Quy trình xử lý đổi, hoàn, hủy vé', '/gioi-thieu#refund-policy'],
    ],
  },
  {
    title: 'Dịch vụ khác',
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
    title: 'Chuyến bay tốt đẹp',
    links: [
      ['Vietjet e-Voucher', '/dich-vu?service=evoucher'],
      ['Phiếu yêu cầu trực tuyến (e-Forms)', '/lien-he#eforms'],
      ['Bản đồ sân bay', '/dich-vu#san-bay'],
      ['Bản đồ đường bay', '/dich-vu#duong-bay'],
      ['Săn vé giá rẻ', '/trang-chu#deals'],
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
    title: 'Mua vé ở đâu?',
    links: [
      ['Phòng bán vé', '/lien-he#ticket-offices'],
      ['Đại lý bán vé', '/lien-he#agencies'],
      ['Đăng ký khách hàng Doanh nghiệp', '/lien-he#corporate'],
      ['Đăng ký làm đại lý online', '/lien-he#agency-online'],
      ['Hỗ trợ', '/hoi-dap'],
      ['Liên hệ', '/lien-he'],
    ],
  },
] as const;

const ABOUT_LINKS: ReadonlyArray<readonly [string, string]> = [
  ['Giới thiệu công ty', '/gioi-thieu'],
  ['Nhà đầu tư', '/gioi-thieu#investors'],
  ['Cơ hội nghề nghiệp', '/gioi-thieu#careers'],
  ['Tin tức', '/gioi-thieu#news'],
  ['Khuyến mại', '/trang-chu#deals'],
  ['Cẩm nang du lịch', '/gioi-thieu#guide'],
  ['Quảng cáo cùng Vietjet', '/gioi-thieu#ads'],
];

export default function Footer() {
  return (
    // Nền xanh trời #0894A3, thẻ trắng bo góc 40px nổi lên trên.
    <footer className="vj-footer-sky relative overflow-hidden text-xs">
      <div className="mx-auto w-full max-w-[1328px] px-4 pb-8 sm:px-6 lg:px-0">
        {/* Thẻ trắng 1328px, bo góc 40px, padding 50px 48px 40px. */}
        <div className="vj-footer-card">
          {/* Sáu cột liên kết. */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-6">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="vj-footer-heading mb-3">{column.title}</h3>
                <ul className="space-y-1.5">
                  {column.links.map(([title, href]) => (
                    <li key={`${column.title}-${title}`}>
                      <Link href={href} className="vj-footer-link">
                        {title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Về Vietjet + Trung tâm phục vụ Khách hàng. */}
          <div className="mt-10 grid grid-cols-1 gap-8 border-t border-[var(--border)] pt-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="vj-footer-heading mb-3">Về Vietjet</h3>
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

            <div>
              <h3 className="vj-footer-heading mb-3">Trung tâm phục vụ Khách hàng</h3>
              <ul className="space-y-1.5">
                <li>
                  <a href="tel:19001166" className="vj-footer-link">
                    Hỗ trợ 1900 1166
                  </a>
                </li>
                <li>
                  <a href="tel:19001886" className="vj-footer-link">
                    Đặt vé qua tổng đài 1900 1886
                  </a>
                </li>
                <li>
                  <Link href="/hoi-dap" className="vj-footer-link">
                    Câu hỏi thường gặp
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kết nối + ứng dụng di động. */}
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
      </div>
    </footer>
  );
}
