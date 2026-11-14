'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/ui';

/**
 * Bottom navigation for phones.
 *
 * Vietjet live parity:
 * - 4 tab chuẩn: 'Trang chủ', 'Vé của tôi', 'Mua vé', 'Làm thủ tục'.
 * - Kích thước mỗi mục: 87×56px.
 * - Active color: #EC2029.
 * - Bo góc thanh nav: 15px 15px 0 0.
 * - Chiều cao: 62px.
 */
interface Tab {
  label: string;
  href: string;
  icon: string;
}

const TABS: readonly Tab[] = [
  {
    label: 'Trang chủ',
    href: '/trang-chu',
    icon: 'HomeIcon',
  },
  {
    label: 'Vé của tôi',
    href: '/chuyen-bay-cua-toi',
    icon: 'TicketIcon',
  },
  {
    label: 'Mua vé',
    href: '/trang-chu#hero-booking-form',
    icon: 'ShoppingBagIcon',
  },
  {
    label: 'Làm thủ tục',
    href: '/lam-thu-tuc',
    icon: 'ClipboardDocumentCheckIcon',
  },
] as const;

/**
 * Highlight class for the tab matching the current route.
 * Chuẩn Vietjet live: active color #EC2029.
 */
const ACTIVE_CLASS = 'text-[#EC2029] font-medium';

/** Paths where a bottom bar would fight the page's own sticky footer. */
const HIDDEN_ON = ['/quan-tri', '/dang-nhap', '/dat-lai-mat-khau', '/quen-mat-khau', '/tim-ve'];

/**
 * Height the bar occupies, exported so pages that already pad for a sticky
 * bottom element can line their own spacer up with it.
 *
 * Site thật: 62px trên mobile, bo góc trên 15px 15px 0 0.
 */
export const BOTTOM_NAV_HEIGHT = 62;

export default function MobileBottomNav() {
  const pathname = usePathname();
  if (!pathname || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <nav
      aria-label="Điều hướng nhanh"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-vj-bottomnav bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.08)] lg:hidden"
      style={{
        height: BOTTOM_NAV_HEIGHT,
        borderTopLeftRadius: '15px',
        borderTopRightRadius: '15px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex h-full max-w-lg items-center justify-around sm:justify-center sm:gap-2 px-[12px]">
        {TABS.map((tab) => {
          const base = tab.href.split('#')[0].split('?')[0];
          const active = base === '/trang-chu' ? pathname === '/trang-chu' : pathname.startsWith(base);
          return (
            <li key={tab.label} className="min-w-0 flex-shrink-0 flex items-center justify-center">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex w-[87px] h-[56px] min-h-[56px] flex-col items-center justify-center gap-[4px] px-[2px] text-[13px] font-medium leading-[16px] transition-colors ${
                  active ? ACTIVE_CLASS : 'text-[#1f2a33] hover:text-[#EC2029]'
                }`}
              >
                <Icon name={tab.icon} size={24} />
                <span className="w-full text-center leading-[14px] truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
