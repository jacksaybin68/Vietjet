import Link from 'next/link';
import { HiOutlineArrowUpRight, HiOutlinePhone, HiOutlineMapPin } from 'react-icons/hi2';

const FOOTER_GROUPS = [
  {
    title: 'Hành trình',
    links: [
      ['Tìm và đặt vé', '/tim-ve'],
      ['Chuyến bay của tôi', '/chuyen-bay-cua-toi'],
      ['Check-in online', '/lam-thu-tuc'],
      ['Tra cứu đặt chỗ', '/tra-cuu'],
    ],
  },
  {
    title: 'Dịch vụ',
    links: [
      ['Hành lý', '/dich-vu?service=baggage'],
      ['Chọn chỗ ngồi', '/dich-vu?service=seat'],
      ['Bữa ăn trên máy bay', '/dich-vu?service=meal'],
      ['Bảo hiểm', '/dich-vu?service=insurance'],
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      ['Trung tâm hỗ trợ', '/lien-he'],
      ['Câu hỏi thường gặp', '/hoi-dap'],
      ['Giới thiệu', '/gioi-thieu'],
      ['Chính sách bảo mật', '/gioi-thieu'],
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-[1240px] px-4 py-10 md:py-12">
        <div className="grid gap-9 md:grid-cols-[1.1fr_2fr] lg:grid-cols-[1.3fr_2.2fr_1fr]">
          <div>
            <Link href="/trang-chu" className="inline-flex" aria-label="VietjetSim - Trang chủ">
              <img src="/logo-vj.svg" alt="VietjetSim" className="h-10 w-auto" loading="lazy" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--foreground-muted)]">
              Trải nghiệm đặt vé trực tuyến nhanh chóng, quản lý chuyến bay và thanh toán tiện lợi
              trên mọi thiết bị.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm font-semibold text-[var(--foreground)]">
              <a
                href="tel:19001166"
                className="flex items-center gap-2 hover:text-[var(--primary)]"
              >
                <HiOutlinePhone className="text-[var(--primary)]" />
                1900 1166
              </a>
              <p className="flex items-center gap-2">
                <HiOutlineMapPin className="text-[var(--primary)]" />
                Hỗ trợ 24/7
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-7 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="border-l-4 border-[var(--primary)] pl-3 text-sm font-black text-[var(--foreground)]">
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-[var(--foreground-muted)] transition-colors hover:text-[var(--primary)]"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
              Bắt đầu hành trình
            </p>
            <h2 className="mt-2 text-lg font-black text-[var(--foreground)]">
              Tìm chuyến bay giá tốt
            </h2>
            <p className="mt-2 text-sm leading-5 text-[var(--foreground-muted)]">
              Chọn điểm đi và đến để xem các chuyến bay phù hợp.
            </p>
            <Link
              href="/tim-ve"
              className="vj-cta mt-5 flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-black"
            >
              Tìm chuyến bay
              <HiOutlineArrowUpRight className="text-lg" />
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-[var(--vj-navy)] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-4 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 VietjetSim · Dự án mô phỏng giao diện và nghiệp vụ đặt vé.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            <Link href="/gioi-thieu" className="hover:text-[var(--accent)]">
              Điều khoản
            </Link>
            <Link href="/gioi-thieu" className="hover:text-[var(--accent)]">
              Bảo mật
            </Link>
            <Link href="/lien-he" className="hover:text-[var(--accent)]">
              Liên hệ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
