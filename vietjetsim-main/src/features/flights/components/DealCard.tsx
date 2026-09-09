import React, { useRef } from 'react';
import Link from 'next/link';
import { AppImage } from '@/shared/components/ui';
import { DealCardProps } from '@/types/deals';
import { MdCalendarToday, MdArrowForward, MdLocalFireDepartment } from 'react-icons/md';

/**
 * Chỉ hiển thị một deal card.
 * <card> : card card card.
 */
const DealCard: React.FC<DealCardProps> = ({ deal }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  // Parallax logic (reused from DealsSection, kept minimal)
  React.useEffect(() => {
    const handleScroll = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const viewH = window.innerHeight;
      const cardCenter = rect.top + rect.height / 2;
      const relativePos = (viewH / 2 - cardCenter) / viewH;
      const parallaxY = relativePos * 28;
      if (imgRef.current) {
        imgRef.current.style.transform = `translateY(${parallaxY}px) scale(1.12)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Link
      key={deal.route}
      href={`/tim-ve?from=${deal.from}&to=${deal.to}`}
      className="group rounded-md relative overflow-hidden cursor-pointer"
    >
      <div
        ref={cardRef}
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
      >
        <div ref={imgRef} className="overflow-hidden rounded-t-lg bg-gray-200 relative h-48">
          <AppImage
            src={deal.image}
            alt={deal.alt}
            className="w-full h-full object-cover transition-transform duration-200"
          />
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <MdCalendarToday className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">{deal.date}</span>
          </div>
          <h3 className="text-semibold text-base mb-1">{deal.route}</h3>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-vj-text">
              {deal.price.toLocaleString()}đ
            </span>
            <span className="text-sm text-gray-400 line-through">
              {deal.original.toLocaleString()}đ
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="px-2 py-0.5 rounded-full bg-green-500 text-xs text-white">
              {deal.discount}
            </span>
            <MdArrowForward className="w-4 h-4 text-vj-text" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DealCard;
