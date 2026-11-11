'use client';

import React from 'react';

/**
 * Logo thương hiệu chính thức của các phương thức thanh toán.
 *
 * Trước đây các logo ở đây được vẽ tay bằng path SVG nên sai hình (Visa méo,
 * MoMo ra hai hình tròn "00", Apple Pay/Google Pay lệch kích thước). Nay toàn bộ
 * được lấy từ file vector/raster gốc của hãng, đặt trong `/public/images/payments`,
 * nên giữ nguyên màu và nét của nhà cung cấp.
 *
 * Quy ước kích thước: mọi logo được bọc trong một hộp cao cố định (`h-*`) và
 * giới hạn bề rộng (`max-w-*`) để các ô chọn phương thức có nhịp cao đều nhau.
 */

interface BrandLogoProps {
  className?: string;
  /** Tên file trong `/public/images/payments`. */
  src: string;
  alt: string;
  /** Kích thước gốc của file, dùng để tránh layout shift. */
  width: number;
  height: number;
}

function BrandLogo({ className = '', src, alt, width, height }: BrandLogoProps) {
  return (
    <img
      src={`/images/payments/${src}`}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      className={`object-contain ${className}`}
    />
  );
}

// ─── 1. Visa ────────────────────────────────────────────────────────────────
export function VisaLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="visa.svg" alt="Visa" width={1000} height={325} />;
}

// ─── 2. Mastercard ──────────────────────────────────────────────────────────
export function MastercardLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <BrandLogo
      className={className}
      src="mastercard.svg"
      alt="Mastercard"
      width={1000}
      height={618}
    />
  );
}

// ─── 3. JCB ─────────────────────────────────────────────────────────────────
export function JcbLogo({ className = 'h-4 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="jcb.svg" alt="JCB" width={300} height={232} />;
}

// ─── 4. American Express ────────────────────────────────────────────────────
export function AmexLogo({ className = 'h-4 w-auto' }: { className?: string }) {
  return (
    <BrandLogo
      className={className}
      src="amex.png"
      alt="American Express"
      width={388}
      height={150}
    />
  );
}

// ─── 5. Napas ───────────────────────────────────────────────────────────────
export function NapasLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="napas.png" alt="NAPAS" width={400} height={107} />;
}

// ─── 6. VietQR ──────────────────────────────────────────────────────────────
export function VietQrLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <BrandLogo className={className} src="vietqr.svg" alt="VietQR" width={3000} height={860} />
  );
}

// ─── 7. VNPAY ───────────────────────────────────────────────────────────────
export function VnpayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="vnpay.svg" alt="VNPAY" width={138} height={42} />;
}

// ─── 8. MoMo ────────────────────────────────────────────────────────────────
export function MomoLogo({ className = 'h-7 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="momo.png" alt="MoMo" width={570} height={570} />;
}

// ─── 9. ZaloPay ─────────────────────────────────────────────────────────────
export function ZaloPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <BrandLogo className={className} src="zalopay.png" alt="ZaloPay" width={2115} height={479} />
  );
}

// ─── 10. Apple Pay ──────────────────────────────────────────────────────────
export function ApplePayLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <BrandLogo className={className} src="apple-pay.svg" alt="Apple Pay" width={512} height={210} />
  );
}

// ─── 11. Google Pay ─────────────────────────────────────────────────────────
export function GooglePayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <BrandLogo
      className={className}
      src="google-pay.svg"
      alt="Google Pay"
      width={1396}
      height={250}
    />
  );
}

// ─── 12. SkyJoy (ví tích lũy / điểm SkyPoint) ───────────────────────────────
export function SkyJoyLogo({ className = 'h-7 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="skyjoy.png" alt="SkyJoy" width={56} height={56} />;
}

// ─── 13. Movi (trả góp) ─────────────────────────────────────────────────────
export function MoviLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return <BrandLogo className={className} src="movi.png" alt="Movi" width={118} height={39} />;
}

// ─── 14. Vietjet Wallet Branded Logo ───────────────────────────────────────
export function VietjetWalletLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#vjWalletGrad)" />
      <defs>
        <linearGradient id="vjWalletGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#EC2029" />
          <stop offset="100%" stopColor="#BA0008" />
        </linearGradient>
      </defs>
      {/* Wallet icon with golden aircraft badge */}
      <path d="M8 10C8 8.9 8.9 8 10 8H22C23.1 8 24 8.9 24 10V12H8V10Z" fill="#FFD200" />
      <path
        d="M7 13C7 11.9 7.9 11 9 11H23C24.1 11 25 11.9 25 13V21C25 22.1 24.1 23 23 23H9C7.9 23 7 22.1 7 21V13Z"
        fill="#FFFFFF"
      />
      <circle cx="21" cy="17" r="2.5" fill="#EC2029" />
      <path d="M12 15L15 17L12 19V15Z" fill="#EC2029" />
    </svg>
  );
}

// ─── 15. GalaxyPay Official Logo ───────────────────────────────────────────
export function GalaxyPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <img
      src="/images/payments/galaxy-pay.png"
      alt="Galaxy Pay"
      width={171}
      height={20}
      className={`${className} object-contain`}
    />
  );
}

// ─── 16. Vietjet Air Official Round Circle Logo ────────────────────────────
export function VietjetAirCircleLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <img
      src="/images/brand/vietjet-air-circle.jpg"
      alt="vietjetAir.com"
      width={255}
      height={255}
      className={`${className} rounded-full object-contain`}
    />
  );
}

// ─── 17. GalaxyPay Official Gateway Seal ───────────────────────────────────
export function GalaxyPayBadge({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-gray-200 shadow-2xs ${className}`}
    >
      <img
        src="/images/payments/galaxy-pay.png"
        alt="Galaxy Pay"
        width={171}
        height={20}
        className="h-3.5 w-auto object-contain"
      />
      <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider pl-1.5 border-l border-gray-200">
        SECURE
      </span>
    </div>
  );
}

// ─── 18. Trust & Security Badges Bar ───────────────────────────────────────
export function PaymentSecurityFooter() {
  return (
    <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-gray-800 block text-2xs uppercase tracking-wider">
            Bảo mật thanh toán 256-bit SSL
          </span>
          <span className="text-3xs text-gray-400">
            Chứng nhận chuẩn bảo mật quốc tế PCI-DSS Level 1
          </span>
        </div>
      </div>

      {/* Accepted logos row */}
      <div className="flex items-center gap-2.5 opacity-90 grayscale-25 hover:grayscale-0 transition-all flex-wrap">
        <VisaLogo className="h-4 w-auto" />
        <MastercardLogo className="h-4 w-auto" />
        <JcbLogo className="h-4 w-auto" />
        <AmexLogo className="h-4 w-auto" />
        <NapasLogo className="h-3.5 w-auto" />
        <VietQrLogo className="h-4 w-auto" />
      </div>
    </div>
  );
}
