import React from 'react';
import Link from 'next/link';
import Icon from '@/shared/components/ui/AppIcon';

interface PageHeroProps {
  /** Small uppercase label rendered inside the pill badge. */
  eyebrow: string;
  /** Hero icon name (heroicons, resolved by AppIcon). */
  iconName?: string;
  title: string;
  description: string;
  /** Home link is hidden on request, e.g. when the hero already sits on "/". */
  showHomeLink?: boolean;
}

/**
 * Shared red hero used by the public information pages. Mirrors vietjetair.com's
 * brand-red sweep so pages stop re-declaring their own inline gradients.
 */
export default function PageHero({
  eyebrow,
  iconName = 'InformationCircleIcon',
  title,
  description,
  showHomeLink = true,
}: PageHeroProps) {
  return (
    <header className="vj-page-hero relative overflow-hidden px-4 py-20 text-center text-white sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-[var(--vj-yellow)] blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
          <Icon name={iconName} size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">{eyebrow}</span>
        </div>
        <h1 className="mb-4 font-body text-4xl font-extrabold md:text-5xl">{title}</h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
          {description}
        </p>
        {showHomeLink && (
          <Link
            href="/trang-chu"
            className="vj-cta mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            Quay lại trang chủ
          </Link>
        )}
      </div>
    </header>
  );
}
