import Link from 'next/link';
import AppImage from '@/shared/components/ui/AppImage';

const promotions = [
  {
    eyebrow: 'Dành cho nhóm từ 10 khách',
    title: 'Bay cùng đồng đội, vui trọn hành trình',
    description: 'Nhận tư vấn hành trình và ưu đãi phù hợp cho chuyến đi của đoàn.',
    action: 'Nhận tư vấn đoàn',
    image: '/assets/images/banners/services.png',
    href: '/lien-he',
  },
  {
    eyebrow: 'Ưu đãi vé bay',
    title: 'Săn vé tốt, khởi hành thật dễ',
    description: 'Khám phá lựa chọn chuyến bay phù hợp cho hành trình nội địa và quốc tế.',
    action: 'Tìm chuyến bay',
    image: '/assets/images/banners/destinations.png',
    href: '/tim-ve',
  },
  {
    eyebrow: 'Dịch vụ cho trẻ em',
    title: 'An tâm để bé tự tin bay',
    description: 'Tìm hiểu hỗ trợ dành cho hành khách nhỏ tuổi trên từng chặng bay.',
    action: 'Xem dịch vụ',
    image: '/assets/images/banners/sky_space.png',
    href: '/dich-vu',
  },
];

export default function PromotionalBannersSection() {
  return (
    <section
      aria-labelledby="promotions-heading"
      className="border-y border-[#ececec] bg-[#f7f7f7] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-[1240px] px-4">
        <div className="mb-7 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#E31E24]">
              Hành trình thêm trọn vẹn
            </p>
            <h2
              id="promotions-heading"
              className="mt-2 text-3xl font-black italic tracking-tight text-[#333] sm:text-4xl"
            >
              Ưu đãi và dịch vụ nổi bật
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#5d5d5d]">
            Chọn dịch vụ phù hợp, chuẩn bị hành trình theo cách của bạn.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {promotions.map((promotion) => (
            <article
              key={promotion.title}
              className="group flex min-h-[330px] overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(36,36,36,.10)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(36,36,36,.16)] focus-within:ring-2 focus-within:ring-[#e30613] focus-within:ring-offset-2"
            >
              <div className="relative flex flex-1 flex-col justify-end overflow-hidden">
                <AppImage
                  src={promotion.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#E31E24]/90 via-[#8075D6]/55 to-[#2563D4]/45" />
                <div className="relative p-6 text-white">
                  <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#FFC400]">
                    {promotion.eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl font-black italic leading-tight">
                    {promotion.title}
                  </h3>
                  <p className="mt-3 text-sm leading-5 text-white/90">{promotion.description}</p>
                  <Link
                    href={promotion.href}
                    className="mt-5 inline-flex rounded-sm border-2 border-[#FFC400] bg-[#FFC400] px-4 py-2 text-sm font-extrabold text-[#333] transition-colors hover:border-white hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {promotion.action}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
