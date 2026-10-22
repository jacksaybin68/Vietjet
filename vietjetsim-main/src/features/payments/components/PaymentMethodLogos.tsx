'use client';

import React from 'react';

// ─── 1. Visa Official Vector Logo ──────────────────────────────────────────
export function VisaLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M38.8 3.2L31.2 28.8H25L30.9 8.9C31.5 6.8 30.6 5.9 28.8 5.7C27 5.5 22.8 6.4 19.8 7.6L20.2 6.1C23.2 4.6 28 3.2 32.2 3.2C36.4 3.2 38.3 5 38.8 3.2ZM53.6 3.2L47.5 28.8H41.6L47.7 3.2H53.6ZM75.5 15.6C75.5 9.7 69.8 6.7 64 6.7C57.4 6.7 52.8 10.6 52.8 15.6C52.8 24.3 64.9 22.3 64.9 26.3C64.9 27.8 63.3 28.8 60.8 28.8C57.2 28.8 53.6 27.5 51.6 26.2L50.4 28.4C52.9 29.8 56.9 30.9 61 30.9C68 30.9 74.3 27.2 74.3 21.6C74.3 13.5 62.4 15.1 62.4 11.2C62.4 9.9 63.7 8.7 66.5 8.7C69.3 8.7 72.3 9.7 73.8 10.7L75.5 15.6ZM98 3.2L91.4 28.8H85.9C84.3 28.8 83 27.9 82.4 26.4L73.9 9.3L79.4 9.3C80.6 9.3 81.6 10.1 82 11.2L85 20.3L89.4 3.2H98ZM17.4 3.2L11.5 21.2L10.9 18.2C9.7 13.3 5.4 7.8 0.4 4.8L0 4.6L0.2 3.2H9.8C12 3.2 13.8 4.7 14.3 6.9L16.2 16.2L17.4 3.2Z"
        fill="#1434CB"
      />
      <path
        d="M17.4 3.2H9.8C7.6 3.2 5.8 4.7 5.3 6.9L0.2 31.8C4.3 30.7 11.2 28.4 14.8 24.7L17.4 3.2Z"
        fill="#F7B600"
      />
    </svg>
  );
}

// ─── 2. Mastercard Official Vector Logo ─────────────────────────────────────
export function MastercardLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="#141414" />
      <circle cx="19" cy="16" r="10" fill="#EB001B" />
      <circle cx="29" cy="16" r="10" fill="#F79E1B" />
      <path
        d="M24 8.7A9.97 9.97 0 0 1 27.8 16A9.97 9.97 0 0 1 24 23.3A9.97 9.97 0 0 1 20.2 16A9.97 9.97 0 0 1 24 8.7Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

// ─── 3. JCB Official Vector Logo ───────────────────────────────────────────
export function JcbLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 52 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="32" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <g transform="translate(6, 4)">
        {/* Blue bar: J */}
        <path d="M0 4C0 1.8 1.8 0 4 0H12V18C12 21.3 9.3 24 6 24C2.7 24 0 21.3 0 18V4Z" fill="#0079C1" />
        <path d="M7 6H10V18C10 19.1 9.1 20 8 20C6.9 20 6 19.1 6 18H4C4 20.2 5.8 22 8 22C10.2 22 12 20.2 12 18V6H7Z" fill="#FFFFFF" />

        {/* Red bar: C */}
        <path d="M14 4C14 1.8 15.8 0 18 0H26V24H18C15.8 24 14 22.2 14 20V4Z" fill="#E60012" />
        <path d="M25 9C23.5 7.5 21.2 7.5 19.7 9C18.2 10.5 18.2 13.5 19.7 15C21.2 16.5 23.5 16.5 25 15V18C22.2 19.5 18.8 19 16.8 17C14.8 15 14.8 11 16.8 9C18.8 7 22.2 6.5 25 8V9Z" fill="#FFFFFF" />

        {/* Green bar: B */}
        <path d="M28 4C28 1.8 29.8 0 32 0H40V24H32C29.8 24 28 22.2 28 20V4Z" fill="#009944" />
        <path d="M31 6H35C36.7 6 38 7.3 38 9C38 10.2 37.3 11.2 36.3 11.7C37.5 12.2 38.3 13.4 38.3 14.7C38.3 16.5 36.8 18 35 18H31V6ZM33 8V11H35C35.6 11 36 10.6 36 10C36 9.4 35.6 9 35 9H33V8ZM33 13V16H35C35.6 16 36 15.6 36 15C36 14.4 35.6 14 35 14H33V13Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

// ─── 4. Napas Official Vector Logo ─────────────────────────────────────────
export function NapasLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2.5 18V6H7.2L12.5 13.5V6H16.8V18H12.2L6.8 10.5V18H2.5ZM26.4 18.3C23.6 18.3 21.6 16.8 21.6 14.2C21.6 11.2 24.3 10.1 27.6 10.1C28.8 10.1 29.8 10.3 30.5 10.6V10C30.5 8.7 29.5 7.8 27.8 7.8C26.4 7.8 25.1 8.3 24.3 8.9L23.1 6.3C24.4 5.4 26.4 4.7 28.6 4.7C32.3 4.7 34.6 6.7 34.6 10.2V18H30.5V16.8C29.6 17.8 28.1 18.3 26.4 18.3ZM27.4 15.3C29.1 15.3 30.5 14.2 30.5 12.7V12.4C29.8 12.1 29 12 28.1 12C26.3 12 25.2 12.7 25.2 13.7C25.2 14.7 26.1 15.3 27.4 15.3ZM41.8 22V6H45.8V7.5C46.8 6.5 48.3 4.8 50.8 4.8C54.4 4.8 57.2 7.7 57.2 12C57.2 16.3 54.3 19.2 50.6 19.2C48.4 19.2 46.9 18.1 45.8 16.9V22H41.8ZM49.4 15.7C51.6 15.7 53.2 14.1 53.2 12C53.2 9.9 51.6 8.3 49.4 8.3C47.2 8.3 45.6 9.9 45.6 12C45.6 14.1 47.2 15.7 49.4 15.7ZM64.6 18.3C61.8 18.3 59.8 16.8 59.8 14.2C59.8 11.2 62.5 10.1 65.8 10.1C67 10.1 68 10.3 68.7 10.6V10C68.7 8.7 67.7 7.8 66 7.8C64.6 7.8 63.3 8.3 62.5 8.9L61.3 6.3C62.6 5.4 64.6 4.7 66.8 4.7C70.5 4.7 72.8 6.7 72.8 10.2V18H68.7V16.8C67.8 17.8 66.3 18.3 64.6 18.3ZM65.6 15.3C67.3 15.3 68.7 14.2 68.7 12.7V12.4C68 12.1 67.2 12 66.3 12C64.5 12 63.4 12.7 63.4 13.7C63.4 14.7 64.3 15.3 65.6 15.3Z"
        fill="#005BAA"
      />
      {/* Orange accent star */}
      <path
        d="M75.5 5.5L77.5 1.5L79.5 5.5L83.5 7.5L79.5 9.5L77.5 13.5L75.5 9.5L71.5 7.5L75.5 5.5Z"
        fill="#F37021"
      />
    </svg>
  );
}

// ─── 5. VietQR Official Vector Logo ────────────────────────────────────────
export function VietQrLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 96 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Icon frame */}
      <g transform="translate(2, 2)">
        {/* Blue and Red Chevrons */}
        <path d="M0 6L9 0L18 6L18 13L9 7L0 13V6Z" fill="#005BAA" />
        <path d="M0 15L9 9L18 15L18 22L9 16L0 22V15Z" fill="#ED1C24" />
      </g>
      {/* Text VIETQR */}
      <text
        x="24"
        y="17"
        fontFamily="sans-serif"
        fontSize="14"
        fontWeight="900"
        fill="#005BAA"
        letterSpacing="0.05em"
      >
        VIET
      </text>
      <text
        x="63"
        y="17"
        fontFamily="sans-serif"
        fontSize="14"
        fontWeight="900"
        fill="#ED1C24"
        letterSpacing="0.05em"
      >
        QR
      </text>
      <rect x="24" y="21" width="68" height="2" rx="1" fill="#005BAA" opacity="0.6" />
    </svg>
  );
}

// ─── 6. VNPAY Vector Logo ──────────────────────────────────────────────────
export function VnpayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 92 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stylized V icon */}
      <path d="M4 4L13 22L20 9L16 4L13 11L7 4H4Z" fill="#ED1C24" />
      <path d="M15 4L13 22L11 22L13 14L15 4Z" fill="#005BAA" />
      {/* Text VNPAY */}
      <text
        x="24"
        y="19"
        fontFamily="sans-serif"
        fontSize="15"
        fontWeight="900"
        fill="#005BAA"
        letterSpacing="-0.02em"
      >
        VN<tspan fill="#ED1C24">PAY</tspan>
      </text>
      {/* QR badge */}
      <rect x="74" y="5" width="16" height="15" rx="3" fill="#ED1C24" />
      <text
        x="76"
        y="17"
        fontFamily="sans-serif"
        fontSize="10"
        fontWeight="900"
        fill="#FFFFFF"
        letterSpacing="-0.02em"
      >
        QR
      </text>
    </svg>
  );
}

// ─── 7. MoMo Official Vector Logo ──────────────────────────────────────────
export function MomoLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="#A50064" />
      {/* MoMo white geometric smiley eyes */}
      <path
        d="M8.5 7.5C6.3 7.5 4.5 9.3 4.5 11.5V16.5C4.5 18.7 6.3 20.5 8.5 20.5C10.7 20.5 12.5 18.7 12.5 16.5V11.5C12.5 9.3 10.7 7.5 8.5 7.5ZM10.5 16.5C10.5 17.6 9.6 18.5 8.5 18.5C7.4 18.5 6.5 17.6 6.5 16.5V11.5C6.5 10.4 7.4 9.5 8.5 9.5C9.6 9.5 10.5 10.4 10.5 11.5V16.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M19.5 7.5C17.3 7.5 15.5 9.3 15.5 11.5V16.5C15.5 18.7 17.3 20.5 19.5 20.5C21.7 20.5 23.5 18.7 23.5 16.5V11.5C23.5 9.3 21.7 7.5 19.5 7.5ZM21.5 16.5C21.5 17.6 20.6 18.5 19.5 18.5C18.4 18.5 17.5 17.6 17.5 16.5V11.5C17.5 10.4 18.4 9.5 19.5 9.5C20.6 9.5 21.5 10.4 21.5 11.5V16.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

// ─── 8. ZaloPay Official Vector Logo ───────────────────────────────────────
export function ZaloPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 85 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zalopayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0068FF" />
          <stop offset="100%" stopColor="#00C4FF" />
        </linearGradient>
      </defs>
      <text
        x="2"
        y="17"
        fontFamily="sans-serif"
        fontSize="15"
        fontWeight="900"
        fill="url(#zalopayGrad)"
        letterSpacing="-0.02em"
      >
        Zalo<tspan fill="#00D26A">Pay</tspan>
      </text>
      <circle cx="80" cy="8" r="2.5" fill="#00D26A" />
    </svg>
  );
}

// ─── 9. Apple Pay Vector Logo ──────────────────────────────────────────────
export function ApplePayLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="28" rx="6" fill="#000000" />
      <g transform="translate(10, 5)" fill="#FFFFFF">
        {/* Apple icon */}
        <path d="M4.6 3.7C5.3 2.8 5.7 1.6 5.5 0.3C4.5 0.4 3.2 1 2.5 1.9C1.9 2.7 1.4 3.9 1.6 5.2C2.7 5.3 4 4.6 4.6 3.7ZM5.5 5.3C4 5.4 3.4 6.3 2.5 6.3C1.6 6.3 1 5.4 0.1 5.4C-1.1 5.4 -2.3 6.6 -2.3 8.8C-2.3 12.3 1.1 16.5 2.5 16.5C3.3 16.5 3.8 15.9 4.7 15.9C5.6 15.9 6.1 16.5 6.9 16.5C8.3 16.5 9.4 14.8 9.9 14.1C8 13 8.3 10.2 10.4 9.4C9.5 8.1 8 6.6 6.3 6.6C5.9 6.6 5.5 5.3 5.5 5.3Z" />
        {/* Pay text */}
        <text x="14" y="14" fontFamily="sans-serif" fontSize="13" fontWeight="bold">
          Pay
        </text>
      </g>
    </svg>
  );
}

// ─── 10. Google Pay Vector Logo ────────────────────────────────────────────
export function GooglePayLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="28" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <g transform="translate(8, 6)">
        {/* Google 4-color G */}
        <path d="M8 8.1V5.7H13.6C13.7 6.2 13.8 6.7 13.8 7.3C13.8 10.7 11.5 13.2 8 13.2C4.5 13.2 1.6 10.3 1.6 6.8C1.6 3.3 4.5 0.4 8 0.4C9.7 0.4 11.2 1 12.3 2.1L10.5 3.9C9.9 3.3 9 2.9 8 2.9C5.9 2.9 4.1 4.7 4.1 6.8C4.1 8.9 5.9 10.7 8 10.7C10.1 10.7 11.4 9.4 11.7 8.1H8Z" fill="#4285F4" />
        <path d="M1.6 6.8C1.6 5.9 1.9 5 2.3 4.2L4.6 6C4.4 6.3 4.3 6.6 4.3 6.8C4.3 7.1 4.4 7.4 4.6 7.7L2.3 9.5C1.9 8.7 1.6 7.8 1.6 6.8Z" fill="#FBBC05" />
        <path d="M8 13.2C9.9 13.2 11.5 12.6 12.6 11.6L10.4 9.8C9.8 10.2 9 10.5 8 10.5C6.4 10.5 5 9.4 4.5 8L2.2 9.7C3.3 11.9 5.5 13.2 8 13.2Z" fill="#34A853" />
        <path d="M8 0.4C9.8 0.4 11.4 1.1 12.6 2.1L10.8 3.9C9.9 3.2 8.9 2.9 8 2.9C5.5 2.9 3.3 4.2 2.2 6.4L4.5 8.1C5 6.7 6.4 5.6 8 0.4Z" fill="#EA4335" />
        {/* Pay text */}
        <text x="18" y="11" fontFamily="sans-serif" fontSize="12" fontWeight="700" fill="#5F6368">
          Pay
        </text>
      </g>
    </svg>
  );
}

// ─── 11. SkyJoy / SkyPay Vector Logo ───────────────────────────────────────
export function SkyPayLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 88 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Golden wings badge */}
      <path d="M3 13C6 7 12 3 18 3C15 7 13 12 11 18C8 18 5 16 3 13Z" fill="#FFC700" />
      <path d="M12 14C15 9 20 6 25 6C22 10 20 15 18 20C16 20 14 17 12 14Z" fill="#EC2029" />
      <text
        x="28"
        y="18"
        fontFamily="sans-serif"
        fontSize="14"
        fontWeight="900"
        fill="#EC2029"
        letterSpacing="0.02em"
      >
        Sky<tspan fill="#FFC700">Pay</tspan>
      </text>
    </svg>
  );
}

// ─── 12. Movi Pay-Later Vector Logo ────────────────────────────────────────
export function MoviLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 70 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text
        x="2"
        y="18"
        fontFamily="sans-serif"
        fontSize="16"
        fontWeight="900"
        fontStyle="italic"
        fill="#E6007E"
        letterSpacing="0.05em"
      >
        movi
      </text>
      <circle cx="58" cy="8" r="3" fill="#00AEEF" />
    </svg>
  );
}

// ─── 13. Vietjet Wallet Branded Logo ───────────────────────────────────────
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
      <path
        d="M8 10C8 8.9 8.9 8 10 8H22C23.1 8 24 8.9 24 10V12H8V10Z"
        fill="#FFD200"
      />
      <path
        d="M7 13C7 11.9 7.9 11 9 11H23C24.1 11 25 11.9 25 13V21C25 22.1 24.1 23 23 23H9C7.9 23 7 22.1 7 21V13Z"
        fill="#FFFFFF"
      />
      <circle cx="21" cy="17" r="2.5" fill="#EC2029" />
      <path d="M12 15L15 17L12 19V15Z" fill="#EC2029" />
    </svg>
  );
}

// ─── 14. GalaxyPay Official Gateway Seal ───────────────────────────────────
export function GalaxyPayBadge({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-500/30 text-white shadow-2xs ${className}`}>
      <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 16l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
      </svg>
      <span className="font-black italic text-2xs tracking-wider text-amber-300 font-sans">
        GALAXY PAY
      </span>
      <span className="text-3xs text-indigo-300 font-bold uppercase tracking-widest pl-1 border-l border-indigo-500/40">
        SECURE
      </span>
    </div>
  );
}

// ─── 15. Trust & Security Badges Bar ───────────────────────────────────────
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
      <div className="flex items-center gap-2.5 opacity-90 grayscale-25 hover:grayscale-0 transition-all">
        <VisaLogo className="h-4 w-auto" />
        <MastercardLogo className="h-4 w-auto" />
        <JcbLogo className="h-4 w-auto" />
        <NapasLogo className="h-3.5 w-auto" />
        <VietQrLogo className="h-4 w-auto" />
      </div>
    </div>
  );
}
