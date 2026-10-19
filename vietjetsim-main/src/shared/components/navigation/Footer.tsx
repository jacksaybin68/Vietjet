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

export default function Footer() {
  return (
    <footer className="relative bg-stone-50 text-gray-800 border-t border-red-100 overflow-hidden text-xs">
      {/* Soft background clouds watermark effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-repeat-x bg-bottom"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 100%, rgba(254, 215, 226, 0.6) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[1320px] px-4 pt-10 pb-8 sm:px-6 lg:px-8">
        {/* Top 5 Columns matching Vietjet screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8 pb-10 border-b border-gray-200/80">
          {/* Cột 1: Để có chuyến bay tốt đẹp */}
          <div className="space-y-2.5">
            <h3 className="font-black text-gray-900 text-xs sm:text-sm2 flex items-center gap-1.5 leading-snug">
              <span className="text-primary-dark font-bold text-sm">✈</span>
              <span>Để có chuyến bay tốt đẹp</span>
            </h3>
            <ul className="space-y-1.5 text-xs2 text-gray-700">
              <li>
                <Link
                  href="/gioi-thieu#terms"
                  className="hover:text-primary-dark transition-colors"
                >
                  Điều lệ vận chuyển
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#fare-rules"
                  className="hover:text-primary-dark transition-colors"
                >
                  Điều kiện vé
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=evoucher"
                  className="hover:text-primary-dark transition-colors"
                >
                  Vietjet e-Voucher
                </Link>
              </li>
              <li>
                <Link href="/lien-he#eforms" className="hover:text-primary-dark transition-colors">
                  Phiếu yêu cầu trực tuyến (e-Forms)
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#rights"
                  className="hover:text-primary-dark transition-colors"
                >
                  Chính sách bảo vệ hành khách
                </Link>
              </li>
              <li>
                <Link href="/gioi-thieu#fees" className="hover:text-primary-dark transition-colors">
                  Phí và lệ phí
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#documents"
                  className="hover:text-primary-dark transition-colors"
                >
                  Giấy tờ tùy thân
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#airports"
                  className="hover:text-primary-dark transition-colors"
                >
                  Sân bay và nhà ga quốc tế
                </Link>
              </li>
              <li>
                <Link href="/hanh-ly" className="hover:text-primary-dark transition-colors">
                  Quy định hành lý
                </Link>
              </li>
              <li>
                <Link href="/tra-cuu" className="hover:text-primary-dark transition-colors">
                  Tìm kiếm hành lý
                </Link>
              </li>
              <li>
                <Link href="/hanh-ly#storage" className="hover:text-primary-dark transition-colors">
                  Hành lý tồn kho Quốc tế
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#transit"
                  className="hover:text-primary-dark transition-colors"
                >
                  Thông tin nối chuyến
                </Link>
              </li>
              <li>
                <Link href="/thanh-toan" className="hover:text-primary-dark transition-colors">
                  Kênh thanh toán
                </Link>
              </li>
              <li>
                <Link href="/tra-cuu#vat" className="hover:text-primary-dark transition-colors">
                  Hóa đơn VAT
                </Link>
              </li>
              <li>
                <Link href="/lam-thu-tuc" className="hover:text-primary-dark transition-colors">
                  Hướng dẫn làm thủ tục chuyến bay
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#travel-advisory"
                  className="hover:text-primary-dark transition-colors"
                >
                  Khuyến cáo di chuyển
                </Link>
              </li>
              <li>
                <Link
                  href="/gioi-thieu#codeshare"
                  className="hover:text-primary-dark transition-colors"
                >
                  Hướng dẫn về chuyến bay liên danh (Codeshare)
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 2: Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa... */}
          <div className="space-y-2.5">
            <h3 className="font-black text-gray-900 text-xs sm:text-sm2 flex items-center gap-1.5 leading-snug">
              <span className="text-primary-dark font-bold text-sm">✈</span>
              <span>Mua hành lý, suất ăn, chọn chỗ ngồi và hơn thế nữa...</span>
            </h3>
            <ul className="space-y-1.5 text-xs2 text-gray-700">
              <li>
                <Link
                  href="/dich-vu?service=seat"
                  className="hover:text-primary-dark transition-colors"
                >
                  Chọn chỗ ngồi ưu tiên
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=baggage"
                  className="hover:text-primary-dark transition-colors"
                >
                  Mua trước hành lý
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=meal"
                  className="hover:text-primary-dark transition-colors"
                >
                  Đặt trước suất ăn - Vikkafe
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=dutyfree"
                  className="hover:text-primary-dark transition-colors"
                >
                  Hàng miễn thuế
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=souvenir"
                  className="hover:text-primary-dark transition-colors"
                >
                  Quà lưu niệm
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=entertainment"
                  className="hover:text-primary-dark transition-colors"
                >
                  Giải trí
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=pet"
                  className="hover:text-primary-dark transition-colors"
                >
                  Dịch vụ vận chuyển thú cưng
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=unaccompanied-minor"
                  className="hover:text-primary-dark transition-colors"
                >
                  Dịch vụ trẻ em đi một mình
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=flywithyou"
                  className="hover:text-primary-dark transition-colors"
                >
                  Dịch vụ hỗ trợ &ldquo;Bay cùng bạn&rdquo;
                </Link>
              </li>
              <li>
                <Link
                  href="/dich-vu?service=extra-seat"
                  className="hover:text-primary-dark transition-colors"
                >
                  Mua thêm chỗ ngồi bên cạnh
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Dịch vụ cao cấp & Vé Vietjet */}
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-gray-900 text-xs sm:text-sm2 flex items-center gap-1.5 leading-snug mb-2">
                <span className="text-primary-dark font-bold text-sm">✈</span>
                <span>Dịch vụ cao cấp</span>
              </h3>
              <ul className="space-y-1.5 text-xs2 text-gray-700">
                <li>
                  <Link
                    href="/dich-vu?service=business"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Hạng vé thương gia - Business
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dich-vu?service=skyboss"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Hạng vé Skyboss
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dich-vu?service=lounge"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Phòng chờ sang trọng
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-gray-900 text-xs sm:text-sm2 flex items-center gap-1.5 leading-snug mb-2">
                <span className="text-primary-dark font-bold text-sm">✈</span>
                <span>Vé Vietjet</span>
              </h3>
              <ul className="space-y-1.5 text-xs2 text-gray-700">
                <li>
                  <Link href="/gioi-thieu" className="hover:text-primary-dark transition-colors">
                    Giới thiệu công ty
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gioi-thieu#investors"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Nhà đầu tư
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gioi-thieu#careers"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Cơ hội nghề nghiệp
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gioi-thieu#news"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Tin tức
                  </Link>
                </li>
                <li>
                  <Link
                    href="/trang-chu#deals"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Khuyến mại
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gioi-thieu#guide"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Cẩm nang du lịch
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gioi-thieu#ads"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Quảng cáo cùng Vietjet
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Cột 4: Trung tâm phục vụ Khách hàng & Mua vé ở đâu? */}
          <div className="space-y-4">
            <div>
              <h3 className="font-black text-gray-900 text-xs sm:text-sm2 flex items-center gap-1.5 leading-snug mb-2">
                <span className="text-primary-dark font-bold text-sm">✈</span>
                <span>Trung tâm phục vụ Khách hàng</span>
              </h3>
              <ul className="space-y-1.5 text-xs2 text-gray-700">
                <li>
                  <Link href="/hoi-dap" className="hover:text-primary-dark transition-colors">
                    Hỗ trợ
                  </Link>
                </li>
                <li>
                  <Link href="/lien-he" className="hover:text-primary-dark transition-colors">
                    Liên hệ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-gray-900 text-xs sm:text-sm2 flex items-center gap-1.5 leading-snug mb-2">
                <span className="text-primary-dark font-bold text-sm">✈</span>
                <span>Mua vé ở đâu?</span>
              </h3>
              <ul className="space-y-1.5 text-xs2 text-gray-700">
                <li>
                  <Link
                    href="/lien-he#ticket-offices"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Phòng bán vé
                  </Link>
                </li>
                <li>
                  <Link
                    href="/lien-he#agencies"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Đại lý bán vé
                  </Link>
                </li>
                <li>
                  <Link
                    href="/lien-he#corporate"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Đăng ký khách hàng Doanh nghiệp
                  </Link>
                </li>
                <li>
                  <Link
                    href="/lien-he#agency-online"
                    className="hover:text-primary-dark transition-colors"
                  >
                    Đăng ký làm đại lý online
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Cột 5: 8 Mục chính sách nổi bật */}
          <div className="space-y-2">
            {[
              ['Tìm vật phẩm bỏ quên', '/tra-cuu#lost-found'],
              ['Đăng nhập đại lý', '/dang-nhap?type=agency'],
              ['Dịch vụ hàng hóa', '/dich-vu?service=cargo'],
              ['Chính sách về quyền riêng tư', '/gioi-thieu#privacy'],
              ['Chính sách sử dụng Cookies', '/gioi-thieu#cookies'],
              [
                'Chính sách bảo vệ quyền lợi khách hàng dễ bị tổn thương',
                '/gioi-thieu#vulnerable-customers',
              ],
              [
                'Chính sách ưu đãi cho người lớn tuổi, người khuyết tật',
                '/gioi-thieu#special-assistance',
              ],
              ['Quy trình xử lý đổi, hoàn, hủy vé', '/gioi-thieu#refund-policy'],
            ].map(([title, href]) => (
              <div key={title} className="py-0.5">
                <Link
                  href={href}
                  className="font-bold text-gray-900 hover:text-primary-dark text-xs sm:text-xs flex items-start gap-1.5 leading-snug transition-colors"
                >
                  <span className="text-primary-dark font-bold text-sm shrink-0">✈</span>
                  <span>{title}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Socials, Quick Guides, App Downloads, Company Info, Mascot, Hotline */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative">
          {/* Left: Kết nối với Vietjet + Flightradar */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-xs text-gray-900">Kết nối với Vietjet</h4>
            <div className="flex items-center gap-2">
              <a
                href="https://facebook.com/vietjetvietnam"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-7 h-7 rounded bg-social-facebook text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <RiFacebookFill size={16} />
              </a>
              <a
                href="https://instagram.com/vietjet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-7 h-7 rounded bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <RiInstagramLine size={16} />
              </a>
              <a
                href="https://twitter.com/vietjetvietnam"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="w-7 h-7 rounded bg-black text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <RiTwitterXFill size={14} />
              </a>
              <a
                href="https://line.me/R/ti/p/@vietjet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LINE"
                className="w-7 h-7 rounded bg-social-line text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <SiLine size={16} />
              </a>
              <a
                href="https://zalo.me/vietjet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zalo"
                className="w-7 h-7 rounded bg-social-zalo text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <SiZalo size={16} />
              </a>
              <a
                href="https://youtube.com/vietjet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-7 h-7 rounded bg-social-youtube text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <RiYoutubeFill size={16} />
              </a>
            </div>

            <div className="flex items-center gap-1.5 text-xs2 text-gray-700 pt-1">
              <span>Cập nhật thông tin chuyến bay Flightradar</span>
              <span className="w-5 h-5 rounded-full border border-sky-400 text-sky-500 flex items-center justify-center">
                <RiRadarLine size={12} />
              </span>
            </div>
          </div>

          {/* Middle: Hướng dẫn đặt vé / thanh toán & Tải App */}
          <div className="md:col-span-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-800">
              <Link
                href="/hoi-dap#dat-ve"
                className="flex items-center gap-1.5 hover:text-primary-dark transition-colors"
              >
                <span className="w-5 h-5 rounded border border-primary-dark text-primary-dark flex items-center justify-center text-2xs">
                  ✈
                </span>
                <span className="italic font-bold">Hướng dẫn đặt chuyến bay</span>
              </Link>
              <Link
                href="/hoi-dap#thanh-toan"
                className="flex items-center gap-1.5 hover:text-primary-dark transition-colors"
              >
                <span className="text-primary-dark text-sm">💳</span>
                <span className="italic font-bold">Hướng dẫn thanh toán</span>
              </Link>
            </div>

            <div>
              <p className="font-bold text-xs text-gray-900 mb-2">
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

          {/* Right: Thông tin pháp nhân + Bộ Công Thương */}
          <div className="md:col-span-5 space-y-1.5 text-xs2 text-gray-600 leading-relaxed pr-24 sm:pr-28">
            <h5 className="font-black text-gray-900 text-xs">CÔNG TY CỔ PHẦN HÀNG KHÔNG VIETJET</h5>
            <p>302/3 Phố Kim Mã, Phường Ngọc Hà, TP. Hà Nội, Việt Nam.</p>
            <p>Chịu trách nhiệm nội dung: Ông Nguyễn Thanh Sơn</p>
            <div className="pt-1 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 border border-sky-600 bg-sky-50 text-sky-800 px-2 py-0.5 rounded text-2xs font-bold">
                <RiFolderShield2Line size={13} className="text-sky-600" />
                <span>ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG</span>
              </div>
            </div>
          </div>

          {/* Amy Mascot with "Xin chào!" tooltip */}
          <div className="absolute right-12 sm:right-16 bottom-1 flex items-end pointer-events-none">
            <div className="relative mb-14 -mr-1 animate-bounce duration-1000">
              <div className="bg-white text-gray-800 text-2xs font-bold px-2 py-0.5 rounded-full shadow border border-gray-200">
                Xin chào!
              </div>
              <div className="w-1.5 h-1.5 bg-white border-r border-b border-gray-200 rotate-45 mx-auto -mt-0.5" />
            </div>
            <img
              src="/images/hero/amy-mascot.png"
              alt="Mascot Amy"
              className="w-14 h-auto drop-shadow-md select-none"
              loading="lazy"
            />
          </div>

          {/* Curved red/green Hotline banner in bottom-right corner */}
          <div className="absolute -right-6 -bottom-6 overflow-hidden pointer-events-auto">
            <div
              className="bg-gradient-to-r from-lime-500 via-primary-dark to-red-700 text-white font-black text-xs sm:text-sm px-10 pt-4 pb-2 shadow-xl rotate-[-25deg] transform origin-bottom-right"
              style={{
                borderRadius: '9999px 0 0 0',
              }}
            >
              <a
                href="tel:19001886"
                className="flex items-center gap-1 hover:text-amber-200 transition-colors cursor-pointer"
              >
                <span>Hotline:</span>
                <span className="text-yellow-200 font-black">1900 1886</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
