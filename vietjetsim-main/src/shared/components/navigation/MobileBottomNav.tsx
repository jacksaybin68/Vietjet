'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/ui';

/**
 * Bottom navigation for phones.
 *
 * The site header collapses to a hamburger below `lg`, which pushes every
 * frequent task two taps deep. This bar keeps the four things a traveller
 * actually reaches for one tap away, the way vietjetair.com's own mobile
 * footer does. It is hidden from `lg` up, where the header nav already shows
 * the same destinations inline.
 */
interface Tab {
  label: string;
  href: string;
  icon: string;
}

const TABS: readonly Tab[] = [
  {
    label: 'Đặt vé',
    href: '/trang-chu#hero-booking-form',
    icon: 'PaperAirplaneIcon',
  },
  {
    label: 'Chuyến của tôi',
    href: '/chuyen-bay-cua-toi',
    icon: 'TicketIcon',
  },
  {
    label: 'Hành lý & chỗ',
    href: '/dich-vu?service=baggage',
    icon: 'BriefcaseIcon',
  },
  {
    label: 'Check-in',
    href: '/lam-thu-tuc',
    icon: 'ClipboardDocumentCheckIcon',
  },
] as const;

/** Highlight class for the tab matching the current route. */
const ACTIVE_CLASS = 'text-vjyellow font-black';

/** Paths where a bottom bar would fight the page's own sticky footer. */
const HIDDEN_ON = ['/quan-tri', '/dang-nhap', '/dat-lai-mat-khau', '/quen-mat-khau', '/tim-ve', '/chuyen-bay-cua-toi'];

/**
 * Height the bar occupies, exported so pages that already pad for a sticky
 * bottom element can line their own spacer up with it.
 */
export const BOTTOM_NAV_HEIGHT = 60;

export default function MobileBottomNav() {
  const pathname = usePathname();
  if (!pathname || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <nav
      aria-label="Điều hướng nhanh"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#4A070A] text-white shadow-[0_-2px_12px_rgba(0,0,0,0.25)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch" style={{ height: BOTTOM_NAV_HEIGHT }}>
        {TABS.map((tab) => {
          const active =
            tab.href.split('#')[0].split('?')[0] === '/trang-chu'
              ? pathname === '/trang-chu'
              : pathname.startsWith(tab.href.split('?')[0]);
          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold leading-none transition-colors ${
                  active ? ACTIVE_CLASS : 'text-white/70 hover:text-white'
                }`}
              >
                <Icon name={tab.icon} size={20} />
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
