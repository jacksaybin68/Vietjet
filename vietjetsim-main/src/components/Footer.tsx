import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaApple,
  FaGooglePlay,
} from 'react-icons/fa';
import { SiZalo, SiWechat } from 'react-icons/si';
import { MdVerified } from 'react-icons/md';

const FOOTER_COLS = [
  {
    title: 'Bay an toàn',
    links: [
      { label: 'Điều khoản & Điều kiện', href: '/gioi-thieu' },
      { label: 'Quy tắc giá vé', href: '/hoi-dap' },
      { label: 'Chính sách hoàn vé', href: '/hoi-dap' },
      { label: 'Thông tin hành lý', href: '/dich-vu' },
      { label: 'Biểu mẫu điện tử', href: '/lien-he' },
      { label: 'Phí & Lệ phí', href: '/hoi-dap' },
      { label: 'Tài liệu du lịch', href: '/gioi-thieu' },
    ],
  },
  {
    title: 'Mua hành lý, bữa ăn, chỗ ngồi...',
    links: [
      { label: 'Chọn chỗ ngồi', href: '/dich-vu' },
      { label: 'Đặt trước hành lý', href: '/dich-vu' },
      { label: 'Đặt trước bữa ăn', href: '/dich-vu' },
      { label: 'Duty Free', href: '/dich-vu' },
      { label: 'Quà lưu niệm', href: '/dich-vu' },
      { label: 'Giải trí trên máy bay', href: '/dich-vu' },
      { label: 'Dịch vụ hỗ trợ đặc biệt', href: '/lien-he' },
    ],
  },
  {
    title: 'Dịch vụ cao cấp',
    links: [
      { label: 'Hạng thương gia', href: '/dich-vu' },
      { label: 'SkyBoss', href: '/dich-vu' },
      { label: 'Phòng chờ sang trọng', href: '/dich-vu' },
    ],
  },
  {
    title: 'Về Vietjet Air',
    links: [
      { label: 'Hồ sơ công ty', href: '/gioi-thieu' },
      { label: 'Nhà đầu tư', href: '/gioi-thieu' },
      { label: 'Tuyển dụng', href: '/gioi-thieu' },
      { label: 'Tin tức', href: '/gioi-thieu' },
      { label: 'Hướng dẫn du lịch', href: '/hoi-dap' },
      { label: 'Ưu đãi hot', href: '/' },
    ],
  },
  {
    title: 'Mua vé ở đâu?',
    links: [
      { label: 'Tổng đài hỗ trợ', href: '/lien-he' },
      { label: 'Văn phòng đặt vé', href: '/lien-he' },
      { label: 'Đại lý du lịch', href: '/gioi-thieu' },
      { label: 'GDS / Interline', href: '/gioi-thieu' },
      { label: 'Sky Corporate', href: '/dich-vu' },
      { label: 'Đăng ký đại lý online', href: '/dang-nhap' },
    ],
  },
];

const QUICK_LINKS = [
  { label: 'Đăng nhập đại lý', href: '/dang-nhap' },
  { label: 'Tìm hành lý thất lạc', href: '/lien-he' },
  { label: 'Câu hỏi thường gặp', href: '/hoi-dap' },
  { label: 'Tuyển dụng', href: '/gioi-thieu' },
  { label: 'Vận chuyển hàng hóa', href: '/dich-vu' },
  { label: 'Chính sách bảo mật', href: '/gioi-thieu' },
];

const AWARDS = [
  { text: 'Hãng hàng không giá rẻ tốt nhất Châu Á 2019' },
  { text: 'Doanh nghiệp hàng không tốt nhất Đông Nam Á' },
  { text: 'Top 50 công ty niêm yết tốt nhất Việt Nam' },
  { text: 'Thương hiệu tốt nhất Châu Á' },
  { text: 'Công ty tốt nhất để làm việc tại Châu Á' },
  { text: 'Kinh doanh bền vững' },
];

const SOCIALS = [
  { name: 'Facebook', Icon: FaFacebook, href: '#' },
  { name: 'Instagram', Icon: FaInstagram, href: '#' },
  { name: 'YouTube', Icon: FaYoutube, href: '#' },
  { name: 'TikTok', Icon: FaTiktok, href: '#' },
  { name: 'Zalo', Icon: SiZalo, href: '#' },
  { name: 'WeChat', Icon: SiWechat, href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 font-body">
      {/* Main footer columns */}
      <div className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {FOOTER_COLS?.map((col) => (
              <div key={col?.title}>
                <h4
                  className="text-[13px] mb-4 flex items-center gap-1.5 text-vj-text"
                  style={{ fontWeight: 700 }}
                >
                  <span className="w-1 h-4 rounded-full inline-block flex-shrink-0 bg-primary-solid" />
                  {col?.title}
                </h4>
                <ul className="space-y-2">
                  {col?.links?.map((link, idx) => (
                    <li key={link.label || idx}>
                      <Link
                        href={link.href || '#'}
                        className="text-[12px] leading-relaxed text-vj-gray transition-colors hover:text-[#EC2029]"
                        style={{ fontWeight: 500 }}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {QUICK_LINKS?.map((link, idx) => (
                <Link
                  key={link.label || idx}
                  href={link.href || '#'}
                  className="text-[12px] font-medium flex items-center gap-1 text-vj-gray transition-colors hover:text-[#EC2029]"
                >
                  <span className="w-1 h-1 rounded-full bg-primary-solid" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Red accent bar — VietJet style */}
      <div
        className="h-1"
        style={{ background: 'linear-gradient(90deg, #EC2029 0%, #D0021B 50%, #EC2029 100%)' }}
      />

      {/* Bottom bar */}
      <div className="bg-navy-solid py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center sm:flex-row sm:justify-between gap-5 sm:gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <AppLogo size={40} />
              <div>
                <span
                  className="text-white text-sm"
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 900,
                  }}
                >
                  Vietjet Air
                </span>
                <p className="text-[10px] mt-0.5 font-koho">
                  &copy; 2026 Vietjet Air. Tất cả quyền được bảo lưu.
                </p>
              </div>
              {/* Bộ Công Thương compliance badge */}
              <a
                href="#"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border border-white/20"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <MdVerified className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <span className="text-white text-[9px] leading-tight font-koho">
                  Đã thông báo
                  <br />
                  Bộ Công Thương
                </span>
              </a>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2">
              {SOCIALS?.map((social) => (
                <Link
                  key={social?.name}
                  href={social?.href}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:bg-[#EC2029]"
                  style={{ background: 'rgba(255,255,255,0.14)' }}
                  aria-label={social?.name}
                >
                  <social.Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>

            {/* App store badges */}
            <div className="flex flex-row items-center justify-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 cursor-pointer transition-all hover:bg-white/20 border border-white/20 hover:border-white/40"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <FaApple className="w-5 h-5 text-white" />
                <div>
                  <div
                    className="text-[9px] leading-none"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Tải trên
                  </div>
                  <div className="text-white text-xs font-bold leading-tight font-koho-bold">
                    App Store
                  </div>
                </div>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 cursor-pointer transition-all hover:bg-white/20 border border-white/20 hover:border-white/40"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <FaGooglePlay className="w-5 h-5 text-white" />
                <div>
                  <div
                    className="text-[9px] leading-none"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Tải trên
                  </div>
                  <div className="text-white text-xs font-bold leading-tight font-koho-bold">
                    Google Play
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
