import React from 'react';

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

export default function AwardsSection() {
  return (
    <section className="bg-gray-50 border-y border-gray-200 py-8">
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
    </section>
  );
}
