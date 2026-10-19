'use client';

import Link from 'next/link';

const FAQ_TOPICS = [
  'Đặt vé trực tuyến',
  'Chỗ ngồi',
  'Hành lý',
  'Check-in',
  'Nối chuyến',
  'Suất ăn',
] as const;

export default function FAQSection() {
  return (
    <section className="bg-[var(--vj-wine)] py-12 sm:py-16 overflow-hidden">
      {/* Ribbon đỏ với nếp gấp xanh ở góc phải trên */}
      <div className="relative max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="relative rounded-[24px] overflow-hidden border border-[#b11116]/60 shadow-[0_24px_48px_rgba(120,0,0,0.35)]">
          {/* Nếp gấp xanh (folded corner) */}
          <svg
            className="absolute top-0 right-0 w-24 h-24 text-[var(--vj-blue)]"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 0v24H0zM12 0L24 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <div className="p-8 sm:p-10 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-white italic leading-tight mb-2">
              Câu hỏi thường gặp
            </h2>
            <p className="text-[rgb(var(--accent-rgb))]/90 text-sm sm:text-base">
              Tất cả những gì bạn cần biết trước khi bay cùng Vietjet.
            </p>
          </div>
        </div>

        {/* 6 nút vàng */}
        <div className="mt-10 sm:mt-12 max-w-md sm:max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {FAQ_TOPICS.map((topic) => (
            <Link
              key={topic}
              href={`/hoi-dap?topic=${encodeURIComponent(topic)}`}
              className="flex flex-col items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-4 text-[var(--foreground)] font-black text-sm sm:text-base shadow-[0_4px_12px_rgba(255,221,0,0.35)] transition-all duration-200 hover:bg-[#FDE047] hover:shadow-[0_8px_20px_rgba(255,221,0,0.45)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              aria-label={`Hỏi đáp: ${topic}`}
            >
              {topic}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
