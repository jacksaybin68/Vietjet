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
    <header className="vj-page-hero relative overflow-hidden border-b border-black/10 px-4 py-12 text-white sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-[var(--accent)]/15 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
          <Icon name={iconName} size={15} />
          <span>{eyebrow}</span>
        </div>
        <h1 className="font-heading text-3xl font-black sm:text-4xl lg:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
          {description}
        </p>
        {showHomeLink && (
          <Link
            href="/trang-chu"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--background)] px-5 text-sm font-black text-[var(--primary)] shadow-lg hover:-translate-y-0.5"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            Quay lại trang chủ
          </Link>
        )}
      </div>
    </header>
  );
}
