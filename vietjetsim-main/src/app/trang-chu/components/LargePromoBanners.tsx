import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';

const BANNERS_16_9 = [
  {
    title: 'Khuyến cáo di chuyển',
    description: 'Dịch vụ đưa đón sân bay nhanh chóng, an toàn cho mọi chuyến bay.',
    action: 'Đặt ngay',
    image: '/images/hero/hero-window-clouds.jpg',
    href: '/dich-vu',
  },
  {
    title: 'Vé đoàn',
    description: 'Ưu đãi đặc biệt cho đoàn từ 10 khách trở lên, bay cùng vui hơn.',
    action: 'Xem chi tiết',
    image: '/images/hero/hero-tet-celebration.jpg',
    href: '/lien-he',
  },
] as const;

const VIKKI_BANNER = {
  title: 'Vikki Digital Bank',
  description: 'Mua ngoại tệ toàn chiều rộng - tỷ giá tốt, thanh toán ngay khi đặt vé.',
  action: 'Mua ngoại tệ',
  image: '/images/hero/hero-airport-exchange.jpg',
  href: '/dich-vu',
};

export default function LargePromoBanners() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--surface)] py-10 sm:py-14 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[var(--primary)] mb-2">
            Khuyến mãi nổi bật
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--foreground)] tracking-tight italic">
            Bay hơn, tiết kiệm hơn
          </h2>
        </div>

        {/* Cặp banner 16:9 */}
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {BANNERS_16_9.map((banner) => (
            <Link
              key={banner.title}
              href={banner.href}
              className="group relative rounded-[24px] overflow-hidden border border-[var(--border)] bg-white shadow-sm aspect-[16/9] transition-transform hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)]"
            >
              <AppImage
                src={banner.image}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--vj-wine)]/80 via-[var(--vj-wine)]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white">
                <p className="text-xs2 sm:text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
                  {banner.title}
                </p>
                <h3 className="text-xl sm:text-2xl font-black italic leading-tight mb-3">
                  {banner.description}
                </h3>
                <span className="inline-flex items-center justify-center rounded-md border-2 border-[var(--accent)] bg-[var(--accent)] px-3.5 py-1.5 text-xs2 sm:text-sm font-black text-[var(--foreground)] transition-colors group-hover:border-white group-hover:bg-white">
                  {banner.action}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Banner Vikki Digital Bank / Mua ngoại tệ toàn chiều rộng */}
        <div className="mt-8 sm:mt-10 lg:mt-12 relative rounded-[32px] overflow-hidden border border-[var(--border)] bg-white shadow-lg aspect-[16/6] sm:aspect-[16/5] lg:aspect-[5/2]">
          <AppImage
            src={VIKKI_BANNER.image}
            alt={VIKKI_BANNER.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--vj-wine)]/85 via-[var(--vj-wine)]/55 to-[var(--vj-wine-deep)]/70" />
          <div className="relative z-10 p-6 sm:p-8 lg:p-12 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-yellow-200/20 px-3 py-1 text-xs2 sm:text-xs font-bold text-[var(--accent)] border border-[var(--accent)]/40 mb-4">
              {VIKKI_BANNER.title}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black italic leading-tight mb-3 max-w-[34rem]">
              {VIKKI_BANNER.description}
            </h2>
            <Link
              href={VIKKI_BANNER.href}
              className="inline-flex items-center justify-center rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-[var(--foreground)] transition-colors hover:bg-white hover:text-[var(--vj-wine)] active:scale-95"
            >
              {VIKKI_BANNER.action}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
