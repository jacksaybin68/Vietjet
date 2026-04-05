import React from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaApple,
  FaGooglePlay,
} from 'react-icons/fa';

const FOOTER_COLS = [
  {
    title: 'Bay an toàn',
    links: [
      { label: 'Điều khoản & Điều kiện', href: '/about' },
      { label: 'Quy tắc giá vé', href: '/faq' },
      { label: 'Chính sách hoàn vé', href: '/faq' },
      { label: 'Thông tin hành lý', href: '/services' },
      { label: 'Biểu mẫu điện tử', href: '/contact' },
      { label: 'Phí & Lệ phí', href: '/faq' },
      { label: 'Tài liệu du lịch', href: '/about' },
    ],
  },
  {
    title: 'Mua hành lý, bữa ăn, chỗ ngồi...',
    links: [
      { label: 'Chọn chỗ ngồi', href: '/services' },
      { label: 'Đặt trước hành lý', href: '/services' },
      { label: 'Đặt trước bữa ăn', href: '/services' },
      { label: 'Duty Free', href: '/services' },
      { label: 'Quà lưu niệm', href: '/services' },
      { label: 'Giải trí trên máy bay', href: '/services' },
      { label: 'Dịch vụ hỗ trợ đặc biệt', href: '/contact' },
    ],
  },
  {
    title: 'Dịch vụ cao cấp',
    links: [
      { label: 'Hạng thương gia', href: '/services' },
      { label: 'SkyBoss', href: '/services' },
      { label: 'Phòng chờ sang trọng', href: '/services' },
    ],
  },
  {
    title: 'Về VietjetSim',
    links: [
      { label: 'Hồ sơ công ty', href: '/about' },
      { label: 'Nhà đầu tư', href: '/about' },
      { label: 'Tuyển dụng', href: '/about' },
      { label: 'Tin tức', href: '/about' },
      { label: 'Hướng dẫn du lịch', href: '/faq' },
      { label: 'Ưu đãi hot', href: '/homepage' },
    ],
  },
  {
    title: 'Mua vé ở đâu?',
    links: [
      { label: 'Tổng đài hỗ trợ', href: '/contact' },
      { label: 'Văn phòng đặt vé', href: '/contact' },
      { label: 'Đại lý du lịch', href: '/about' },
      { label: 'GDS / Interline', href: '/about' },
      { label: 'Sky Corporate', href: '/services' },
      { label: 'Đăng ký đại lý online', href: '/sign-up-login' },
    ],
  },
];

const QUICK_LINKS = [
  { label: 'Đăng nhập đại lý', href: '/sign-up-login' },
  { label: 'Tìm hành lý thất lạc', href: '/contact' },
  { label: 'Câu hỏi thường gặp', href: '/faq' },
  { label: 'Tuyển dụng', href: '/about' },
  { label: 'Vận chuyển hàng hóa', href: '/services' },
  { label: 'Chính sách bảo mật', href: '/about' },
];

const AWARDS = [
  { text: 'Hãng hàng không giá rẻ tốt nhất Châu Á 2019' },
  { text: 'Doanh nghiệp hàng không tốt nhất Đông Nam Á' },
  { text: 'Top 50 công ty niêm yết tốt nhất Việt Nam' },
  { text: 'Thương hiệu tốt nhất Châu Á' },
  { text: 'Công ty tốt nhất để làm việc tại Châu Á' },
  { text: 'Kinh doanh bền vững' },
];

const TrophyIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
  </svg>
);

const SOCIALS = [
  { name: 'Facebook', Icon: FaFacebook, href: '#' },
  { name: 'Instagram', Icon: FaInstagram, href: '#' },
  { name: 'YouTube', Icon: FaYoutube, href: '#' },
  { name: 'TikTok', Icon: FaTiktok, href: '#' },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 font-body">
      {/* Awards section */}
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-vj-muted">
              Giải thưởng &amp; Công nhận
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 items-start">
            {AWARDS?.map((award, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-2">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #FFF9C4 0%, #FFF176 100%)',
                    border: '1.5px solid #FFD400',
                  }}
                >
                  <TrophyIcon className="w-7 h-7" style={{ color: '#E6BF00' }} />
                </div>
                <p className="text-[10px] leading-tight font-medium text-vj-gray">{award?.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AppImage
                src="/assets/images/app_logo.svg"
                alt="VietjetSim Logo"
                width={40}
                height={40}
                className="rounded-md"
                priority={true}
              />
              <div>
                <span
                  className="text-white text-sm"
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 900,
                  }}
                >
                  VietjetSim
                </span>
                <p className="text-[10px] mt-0.5 font-koho">
                  &copy; 2026 VietjetSim. Tất cả quyền được bảo lưu.
                </p>
              </div>
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 cursor-pointer transition-all hover:bg-white/20 border border-white/20 hover:border-white/40"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <FaApple className="w-5 h-5 text-white" />
                <div>
                  <div className="text-[9px] leading-none" style={{ color: 'rgba(255,255,255,0.6)' }}>Tải trên</div>
                  <div className="text-white text-xs font-bold leading-tight font-koho-bold">
                    App Store
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg px-3 py-2 cursor-pointer transition-all hover:bg-white/20 border border-white/20 hover:border-white/40"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <FaGooglePlay className="w-5 h-5 text-white" />
                <div>
                  <div className="text-[9px] leading-none" style={{ color: 'rgba(255,255,255,0.6)' }}>Tải trên</div>
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
