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
    label: 'Đặt chuyến bay',
    href: '/trang-chu#hero-booking-form',
    icon: 'PaperAirplaneIcon',
  },
  {
    label: 'Chuyến bay của tôi',
    href: '/chuyen-bay-cua-toi',
    icon: 'TicketIcon',
  },
  {
    label: 'Mua hành lý, chỗ ngồi...',
    href: '/dich-vu?service=baggage',
    icon: 'BriefcaseIcon',
  },
  {
    label: 'Check-in',
    href: '/lam-thu-tuc',
    icon: 'ClipboardDocumentCheckIcon',
  },
] as const;

/**
 * Highlight class for the tab matching the current route.
 *
 * Site thật: mục active dùng vàng `#F7C61A` (token `vj-nav-active`) — cùng
 * sắc vàng với dải dịch vụ trên header, không phải `#FFDD00` của CTA.
 */
const ACTIVE_CLASS = 'text-vj-nav-active font-bold';

/** Paths where a bottom bar would fight the page's own sticky footer. */
const HIDDEN_ON = ['/quan-tri', '/dang-nhap', '/dat-lai-mat-khau', '/quen-mat-khau', '/tim-ve'];

/**
 * Height the bar occupies, exported so pages that already pad for a sticky
 * bottom element can line their own spacer up with it.
 *
 * Site thật: 62px trên mobile, bo góc trên `15px 15px 0 0`, nền gradient
 * `linear-gradient(rgba(0,0,0,0.8) 4.03%, rgba(0,0,0,0.153) 216.13%)`,
 * icon 24×24, nhãn 10px/700.
 */
export const BOTTOM_NAV_HEIGHT = 62;

export default function MobileBottomNav() {
  const pathname = usePathname();
  if (!pathname || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <nav
      aria-label="Điều hướng nhanh"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-vj-bottomnav bg-gradient-vj-bottomnav text-white shadow-[0_-2px_12px_rgba(0,0,0,0.25)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch" style={{ height: BOTTOM_NAV_HEIGHT }}>
        {TABS.map((tab) => {
          const active =
            tab.href.split('#')[0].split('?')[0] === '/trang-chu'
              ? pathname === '/trang-chu'
              : pathname.startsWith(tab.href.split('?')[0]);
          return (
            <li key={tab.label} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full min-h-[58px] flex-col items-center px-[5px] pt-[10px] pb-[5px] text-2xs font-bold leading-[13px] transition-colors ${
                  active ? ACTIVE_CLASS : 'text-white'
                }`}
              >
                <Icon name={tab.icon} size={24} />
                <span className="w-full text-center leading-[12px]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
