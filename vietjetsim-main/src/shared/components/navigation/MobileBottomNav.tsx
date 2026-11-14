'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/shared/components/ui';

/**
 * Bottom navigation for phones.
 *
 * Vietjet live parity (đo DOM sống 14/11/2026, `newweb.vietjetair.com`):
 * - Thanh cố định đáy màn hình, cao `88px` (padding `8px 12px 10px`),
 *   nền trắng, KHÔNG bo góc, KHÔNG đổ bóng.
 * - 4 mục, mỗi mục `87×56px`, cách đều: `x=21`, `108`, `195`, `282`.
 * - Icon `26×26px`, khoảng cách icon ↔ nhãn `6px`.
 * - Nhãn `13px/500`, `line-height: 16px`.
 * - Màu active `rgb(236, 32, 41)` (`#EC2029`), inactive `rgb(31, 42, 51)`.
 *
 * LƯU Ý: thanh 62px bo góc `15px 15px 0 0` là nav BÊN TRONG popup SkyID
 * (`PopupFrame.tsx`) — không phải thanh này.
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
const ACTIVE_CLASS = 'text-[var(--vj-red)]';

/** Paths where a bottom bar would fight the page's own sticky footer. */
const HIDDEN_ON = ['/quan-tri', '/dang-nhap', '/dat-lai-mat-khau', '/quen-mat-khau', '/tim-ve'];

/**
 * Height the bar occupies, exported so pages that already pad for a sticky
 * bottom element can line their own spacer up with it.
 *
 * Site thật: 88px trên mobile.
 */
export const BOTTOM_NAV_HEIGHT = 88;

export default function MobileBottomNav() {
  const pathname = usePathname();
  if (!pathname || HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;

  return (
    <nav
      aria-label="Điều hướng nhanh"
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 bg-white pt-[8px] pb-[10px] lg:hidden"
      style={{
        height: BOTTOM_NAV_HEIGHT,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
      }}
    >
      <ul className="mx-auto flex h-full max-w-lg items-center justify-center px-[12px]">
        {TABS.map((tab) => {
          const base = tab.href.split('#')[0].split('?')[0];
          const active =
            base === '/trang-chu' ? pathname === '/trang-chu' : pathname.startsWith(base);
          return (
            <li key={tab.label} className="min-w-0 flex-shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[56px] w-[87px] flex-col items-center justify-center gap-[6px] px-[2px] text-[13px] font-medium leading-[16px] transition-colors ${
                  active ? ACTIVE_CLASS : 'text-[#1f2a33]'
                }`}
              >
                <Icon name={tab.icon} size={26} />
                <span className="w-full truncate text-center leading-[16px]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
