import React from 'react';
import Link from 'next/link';
import { AppLogo } from '@/shared/components/ui';
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
    title: 'Thông tin hành trình',
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
    title: 'Chuẩn bị chuyến bay',
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
    title: 'Dịch vụ theo nhu cầu',
    links: [
      { label: 'Hạng thương gia', href: '/dich-vu' },
      { label: 'SkyBoss', href: '/dich-vu' },
      { label: 'Phòng chờ sang trọng', href: '/dich-vu' },
    ],
  },
  {
    title: 'Về Vietjet',
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
    title: 'Hỗ trợ đặt vé',
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
    <footer className="border-t border-gray-200 bg-[#f7f7f7] font-body">
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
            {FOOTER_COLS?.map((col) => (
              <div key={col?.title}>
                <h4
                  className="text-[13px] mb-4 flex items-center gap-1.5 text-vjdark"
                  style={{ fontWeight: 700 }}
                >
                  <span className="w-1 h-4 rounded-full inline-block flex-shrink-0 bg-vjred" />
                  {col?.title}
                </h4>
                <ul className="space-y-2">
                  {col?.links?.map((link, idx) => (
                    <li key={link.label || idx}>
                      <Link
                        href={link.href || '#'}
                        className="rounded-sm text-[12px] leading-relaxed text-vjdark/70 hover:text-vjred"
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
                  className="flex items-center gap-1 rounded-sm text-[12px] font-medium text-vjdark/70 hover:text-vjred"
                >
                  <span className="w-1 h-1 rounded-full bg-vjred" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-1 bg-[#e30613]" />

      <div className="bg-[#242424] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center sm:flex-row sm:justify-between gap-5 sm:gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <AppLogo size={40} />
              <div>
                <span className="text-sm font-black text-[#fff200]">Vietjet Air</span>
                <p className="mt-0.5 text-[10px] text-white/70 font-koho">
                  &copy; 2026 Vietjet Air. Tất cả quyền được bảo lưu.
                </p>
              </div>
              <a
                href="#"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border border-white/20"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <MdVerified className="w-5 h-5 text-[#fff200] flex-shrink-0" />
                <span className="text-white text-[9px] leading-tight font-koho">
                  Đã thông báo
                  <br />
                  Bộ Công Thương
                </span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              {SOCIALS?.map((social) => (
                <Link
                  key={social?.name}
                  href={social?.href}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:-translate-y-0.5 hover:bg-vjred"
                  style={{ background: 'rgba(255,255,255,0.14)' }}
                  aria-label={social?.name}
                >
                  <social.Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>

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
