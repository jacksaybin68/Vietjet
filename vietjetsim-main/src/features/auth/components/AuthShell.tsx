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
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:px-8">
          {/* Site thật để form đặt thẳng trên nền mây, không bọc card trắng. */}
          <section className="px-1 py-2 sm:px-2">
            <Link href="/trang-chu" className="mb-6 inline-flex lg:hidden">
              <img src="/logo-vj.svg" alt="Vietjet Air" className="h-7 w-auto" />
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-[30px] font-black leading-tight text-[#333]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6c6f76]">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <p className="mt-7 border-t border-[#eee] pt-5 text-xs leading-5 text-[#6c6f76]">
              * Bạn đã biết về{' '}
              <Link href="/gioi-thieu" className="font-bold text-[var(--primary)]">
                Vietjet SkyJoy
              </Link>
              ?
            </p>
          </section>

          <div className="relative hidden overflow-hidden rounded-xl shadow-[0_16px_48px_rgba(26,41,72,0.16)] lg:block">
            <img
              src="/images/hero/banner-quang-cao-ngoai-te.jpg"
              alt="Mua ngoại tệ dễ dàng khi đặt vé"
              className="h-full w-full object-cover object-left"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
