'use client';

import React from 'react';
import Link from 'next/link';
import AppImage from '@/shared/components/ui/AppImage';
import AppLogo from '@/shared/components/ui/AppLogo';
import Icon from '@/shared/components/ui/AppIcon';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const PERKS = [
  'Đặt vé nhanh với giá ưu đãi',
  'Theo dõi hành trình dễ dàng',
  'Tích điểm và đổi quà SkyJoy',
];

/**
 * Split-screen frame shared by the login, forgot-password and reset-password
 * pages: brand panel on the left, form card on the right.
 *
 * The submit buttons on these pages use `.vj-auth-submit`, which mirrors the
 * real SkyID (skyjoy-authen) login theme rather than the red `.vj-btn-primary`.
 */
export default function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--surface)] font-body">
      <div className="vj-menubar h-1.5 w-full" />
      <div className="mx-auto flex min-h-[calc(100vh-4px)] max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[var(--border)] dark:border-[var(--dark-border)] bg-[var(--background)] shadow-card lg:grid-cols-[1.1fr_1fr]">
          <aside className="relative hidden overflow-hidden bg-gradient-red-vj px-10 py-12 text-white lg:flex lg:flex-col">
            <div className="absolute inset-0 opacity-20">
              <AppImage
                src="/images/hero/banner-2-skyboss.jpg"
                alt="Airplane flying"
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
            <div className="relative z-10 mb-auto">
              <Link href="/trang-chu" className="inline-flex items-center gap-3">
                <AppLogo size={44} />
              </Link>
              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Bay là thích ngay!
              </p>
              <h1 className="mt-6 text-5xl font-black italic leading-tight">
                Vietjet
                <br />
                <span className="text-[var(--accent)]">SkyJoy</span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">
                Trải nghiệm tài khoản hội viên hiện đại, quản lý đặt vé, ưu đãi và lịch sử bay theo
                phong cách nhận diện chính thức của Vietjet Air.
              </p>
            </div>
            <div className="relative z-10 mt-10 space-y-3 border-t border-white/20 pt-8 text-sm">
              {PERKS.map((item) => (
                <p key={item} className="flex items-center gap-2 text-white/90">
                  <Icon name="CheckCircleIcon" size={16} className="text-[var(--accent)]" />
                  {item}
                </p>
              ))}
            </div>
          </aside>

          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <Link href="/trang-chu">
                  <AppLogo size={38} />
                </Link>
                <span className="rounded-full bg-[rgb(var(--accent-rgb))]/20 px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                  Website chính thức Vietjet Air
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-black text-[var(--foreground)]">{title}</h2>
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">{subtitle}</p>
              <div className="mt-8">{children}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
