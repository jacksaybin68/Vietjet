import Link from 'next/link';
import AppImage from '@/shared/components/ui/AppImage';

const promotions = [
  {
    eyebrow: 'Bay theo đoàn',
    title: 'Bay theo đoàn vui ngập tràn',
    description: 'Dành cho đoàn từ 10 khách trở lên',
    action: 'Xem chi tiết',
    image: '/images/hero/hero-artwork-beach-sunset.jpg',
    href: '/lien-he',
    isVisual: true,
  },
  {
    eyebrow: 'Vé Tết',
    title: 'Vé Tết hời, mời bạn bay!',
    description: 'Ưu đãi đặc biệt cho mùa Tết 2027',
    action: 'Săn vé ngay',
    image: '/images/hero/hero-tet-celebration.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Hợp tác DiDi',
    title: 'Vi vu khắp Trung Quốc cùng DiDi',
    description: 'Ưu đãi đặt xe khi bay cùng Vietjet',
    action: 'Tìm hiểu thêm',
    image: '/images/hero/hero-hongkong-skyline.jpg',
    href: '/dich-vu',
    isVisual: true,
  },
  {
    eyebrow: 'Bay khắp thế giới',
    title: 'Bay khắp thế giới, chạm đỉnh cao mới',
    description: 'Khám phá các điểm đến từ Đà Nẵng',
    action: 'Xem hành trình',
    image: '/images/hero/hero-window-clouds.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Ưu đãi đặc biệt',
    title: 'Khám phá hành trình mới',
    description: 'Ưu đãi độc quyền cho khách hàng thân thiết',
    action: 'Xem ngay',
    image: '/images/hero/hero-bali-terraces.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Ưu đãi độc quyền',
    title: 'Bay xa hơn, tiết kiệm hơn',
    description: 'Nhận ngay voucher giảm giá cho chuyến bay tiếp theo',
    action: 'Nhận ưu đãi',
    image: '/images/promos/promo-seoul.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Hành trình mùa hè',
    title: 'Hè rực rỡ, bay cùng Vietjet',
    description: 'Ưu đãi vé hè cho mọi điểm đến nội địa',
    action: 'Đặt vé ngay',
    image: '/images/promos/promo-bali.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Khám phá Á Đông',
    title: 'Điểm đến mơ ước, giá hời bất ngờ',
    description: 'Ưu đãi đặc biệt cho các chặng bay quốc tế',
    action: 'Xem chi tiết',
    image: '/images/promos/promo-bangkok.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Ưu đãi chớp nhoáng',
    title: 'Săn deal hời, bay mỏi tay',
    description: 'Giảm giá sâu cho các khung giờ vàng trong ngày',
    action: 'Săn ngay',
    image: '/images/promos/promo-singapore.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Chào đón mùa lễ hội',
    title: 'Vui lễ hội, bay cùng bạn bè',
    description: 'Ưu đãi đặc biệt dành cho nhóm bạn đi cùng nhau',
    action: 'Đặt chỗ ngay',
    image: '/images/promos/promo-vietnam.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Ưu đãi mới nhất',
    title: 'Bay cùng Vietjet, trọn vẹn niềm vui',
    description: 'Khám phá những ưu đãi mới nhất từ chúng tôi',
    action: 'Xem thêm',
    image: '/images/promos/promo-hongkong.jpg',
    href: '/tim-ve',
    isVisual: true,
  },
  {
    eyebrow: 'Dịch vụ cho trẻ em',
    title: 'An tâm để bé tự tin bay',
    description: 'Tìm hiểu hỗ trợ dành cho hành khách nhỏ tuổi trên từng chặng bay.',
    action: 'Xem dịch vụ',
    image: '/images/hero/hero-sale-aerial.jpg',
    href: '/dich-vu',
    isVisual: false,
  },
];

export default function PromotionalBannersSection() {
  return (
    <section
      aria-labelledby="promotions-heading"
      className="border-y border-vj-border bg-[var(--surface)] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-[1240px] px-4">
        <div className="mb-7 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--primary)]">
              Hành trình thêm trọn vẹn
            </p>
            <h2
              id="promotions-heading"
              className="mt-2 text-3xl font-black italic tracking-tight text-[var(--foreground)] sm:text-4xl"
            >
              Ưu đãi và dịch vụ nổi bật
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-gray-600">
            Chọn dịch vụ phù hợp, chuẩn bị hành trình theo cách của bạn.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promotion) => (
            <Link
              key={promotion.title}
              href={promotion.href}
              className="group flex min-h-[330px] overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(36,36,36,.10)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(36,36,36,.16)] focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2"
            >
              <div className="relative flex flex-1 flex-col justify-end overflow-hidden">
                <AppImage
                  src={promotion.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {!promotion.isVisual && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-tr from-[rgb(var(--primary-rgb))]/90 via-vjpurple/55 to-[rgb(var(--blue-rgb))]/45" />
                    <div className="relative p-6 text-white">
                      <p className="text-xs2 font-extrabold uppercase tracking-[.14em] text-[var(--accent)]">
                        {promotion.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-black italic leading-tight">
                        {promotion.title}
                      </h3>
                      <p className="mt-3 text-sm leading-5 text-white/90">
                        {promotion.description}
                      </p>
                      <div className="mt-5 inline-flex rounded-sm border-2 border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-extrabold text-[var(--foreground)] transition-colors group-hover:border-white group-hover:bg-white">
                        {promotion.action}
                      </div>
                    </div>
                  </>
                )}
                {promotion.isVisual && (
                  <div className="absolute bottom-4 right-4">
                    <div className="rounded-sm border-2 border-white bg-white/90 px-3 py-1.5 text-xs font-extrabold text-vjred shadow-sm backdrop-blur-sm transition-colors group-hover:bg-white">
                      {promotion.action}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
