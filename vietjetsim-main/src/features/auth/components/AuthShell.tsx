'use client';

import React from 'react';
import Link from 'next/link';
import { Header } from '@/shared/components/navigation';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Page frame for the auth screens, laid out like vietjetair.com/vi/signin:
 * site header on top, then a two-column grid — white form card on the left,
 * promo banner on the right, everything on a soft sky background.
 *
 * The submit buttons inside use `.vj-auth-submit`, which mirrors the real
 * SkyID (skyjoy-authen) gold theme rather than the red `.vj-btn-primary`.
 */
export default function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d9e9f8] via-[#eef4fa] to-[#f5f5f5] font-body text-[#333]">
      <Header />
      {/* `pb-36` keeps the floating chat mascot (fixed bottom-right) clear of the
          form card on phones, where the card otherwise reaches the viewport edge. */}
      <div className="pb-36">
        {/* Cột form hẹp lại (560 → 470) để nhường bề ngang cho banner bên phải:
            banner là ảnh 750×650 có chữ bám sát mép phải ("Hỗ trợ toàn quốc"), nên
            cột càng hẹp thì ảnh càng bị cắt và chữ trên ảnh càng khó đọc. */}
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,470px)_minmax(0,1fr)] lg:px-8">
          {/* Site thật để form đặt thẳng trên nền mây, không bọc card trắng. */}
          <section className="px-1 py-2 sm:px-2">
            <Link href="/trang-chu" className="mb-6 inline-flex lg:hidden">
              <img src="/logo-vj.svg" alt="Vietjet Air" className="h-7 w-auto" />
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
              {eyebrow}
            </p>
            <h2 className="mt-2 font-[Be_Vietnam_Pro,sans-serif] text-[28px] font-extrabold leading-[1.2] tracking-[-0.03em] text-[#1a2948]">
              {title}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[#6c6f76]">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <p className="mt-7 border-t border-[#eee] pt-5 text-xs font-bold leading-5 text-[#6c6f76]">
              * Bạn đã biết về{' '}
              <Link href="/gioi-thieu" className="font-bold text-[var(--primary)]">
                Vietjet SkyJoy
              </Link>
              ?
            </p>
          </section>

          {/* Ảnh để cao theo đúng tỉ lệ gốc (`w-full h-auto`) thay vì kéo đầy
              chiều cao form rồi `object-cover`: cover cắt cạnh khi cột hẹp hơn
              chiều cao × tỉ lệ ảnh, và cạnh bị cắt đúng là chỗ có chữ. `self-start`
              giữ ảnh ở đầu cột khi form (tab Đăng ký) cao hơn ảnh, để nó không bị
              kéo giãn. */}
          <div className="relative hidden self-start overflow-hidden rounded-xl shadow-[0_16px_48px_rgba(26,41,72,0.16)] lg:block">
            <img
              src="/images/hero/banner-quang-cao-ngoai-te.jpg"
              alt="Mua ngoại tệ dễ dàng khi đặt vé"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
