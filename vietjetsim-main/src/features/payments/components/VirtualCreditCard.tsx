'use client';

import React from 'react';
import { VisaLogo, MastercardLogo, JcbLogo, AmexLogo } from './PaymentMethodLogos';

interface VirtualCreditCardProps {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
  isFlipped?: boolean;
}

export default function VirtualCreditCard({
  cardNumber,
  cardName,
  expiry,
  cvv,
  isFlipped = false,
}: VirtualCreditCardProps) {
  // Determine card type based on number
  const cleanNumber = cardNumber.replace(/\s/g, '');
  let cardBrand: 'visa' | 'mastercard' | 'jcb' | 'amex' | 'generic' = 'generic';

  if (cleanNumber.startsWith('4')) {
    cardBrand = 'visa';
  } else if (/^(5[1-5]|2[2-7])/.test(cleanNumber)) {
    cardBrand = 'mastercard';
  } else if (/^35/.test(cleanNumber)) {
    cardBrand = 'jcb';
  } else if (/^3[47]/.test(cleanNumber)) {
    cardBrand = 'amex';
  }

  // Format display number
  const formattedNumber = cleanNumber
    .padEnd(16, '•')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();

  return (
    <div className="w-full max-w-sm mx-auto mb-6 perspective-1000">
      <div
        className={`relative w-full aspect-[1.586] rounded-2xl p-5 sm:p-6 text-white shadow-xl transition-transform duration-500 transform-style-3d overflow-hidden ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #991b1b 100%)',
          boxShadow: '0 20px 35px -10px rgba(185, 28, 28, 0.3), 0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Subtle patterned overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

        {/* Shimmer light bar */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {!isFlipped ? (
          // Mặt trước thẻ
          <div className="relative z-10 flex flex-col justify-between h-full">
            {/* Top row: Chip & Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Gold EMV Chip */}
                <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 border border-amber-300/60 p-1 flex flex-col justify-between shadow-xs">
                  <div className="w-full h-0.5 bg-amber-700/30 rounded-xs" />
                  <div className="flex justify-between">
                    <div className="w-1 h-2 bg-amber-700/30 rounded-xs" />
                    <div className="w-1 h-2 bg-amber-700/30 rounded-xs" />
                  </div>
                  <div className="w-full h-0.5 bg-amber-700/30 rounded-xs" />
                </div>
                {/* Contactless waves */}
                <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-8a5 5 0 015-5v2a3 3 0 00-3 3H7zm0 0a5 5 0 005 5v-2a3 3 0 01-3-3H7z" />
                </svg>
              </div>

              {/* Brand Logo */}
              <div className="h-7 flex items-center">
                {cardBrand === 'visa' && (
                  <div className="bg-white/95 px-2 py-0.5 rounded shadow-xs flex items-center">
                    <VisaLogo className="h-3.5 w-auto" />
                  </div>
                )}
                {cardBrand === 'mastercard' && (
                  <div className="bg-white/95 px-1.5 py-0.5 rounded shadow-xs flex items-center">
                    <MastercardLogo className="h-4 w-auto" />
                  </div>
                )}
                {cardBrand === 'jcb' && (
                  <div className="bg-white/95 px-1 py-0.5 rounded shadow-xs flex items-center">
                    <JcbLogo className="h-4 w-auto" />
                  </div>
                )}
                {cardBrand === 'amex' && (
                  <div className="bg-white/95 px-1.5 py-0.5 rounded shadow-xs flex items-center">
                    <AmexLogo className="h-4 w-auto" />
                  </div>
                )}
                {cardBrand === 'generic' && (
                  <span className="text-2xs font-extrabold uppercase tracking-widest text-white/80 border border-white/30 px-2 py-0.5 rounded">
                    DEBIT / CREDIT
                  </span>
                )}
              </div>
            </div>

            {/* Middle: Card Number */}
            <div className="my-auto pt-2">
              <div className="font-mono text-base sm:text-lg tracking-[0.2em] font-semibold text-white/95 drop-shadow-sm select-none">
                {formattedNumber}
              </div>
            </div>

            {/* Bottom: Card Holder & Expiry */}
            <div className="flex items-end justify-between pt-1">
              <div>
                <span className="text-4xs font-bold uppercase tracking-wider text-white/60 block">
                  Chủ thẻ / Card Holder
                </span>
                <span className="font-bold text-xs sm:text-sm tracking-wide uppercase truncate max-w-[190px] block">
                  {cardName || 'NGUYEN VAN A'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-4xs font-bold uppercase tracking-wider text-white/60 block">
                  Hết hạn / Expires
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm tracking-wider">
                  {expiry || 'MM/YY'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Mặt sau thẻ (CVV)
          <div className="relative z-10 flex flex-col justify-between h-full pt-2">
            {/* Magnetic stripe */}
            <div className="w-full h-8 bg-black/90 -mx-6 mb-3" />
            <div className="flex items-center justify-end px-2">
              <div className="w-full bg-white/20 h-7 rounded-sm flex items-center justify-end px-3">
                <span className="font-mono text-black font-black text-sm tracking-widest bg-white px-2 py-0.5 rounded-xs">
                  {cvv || '•••'}
                </span>
              </div>
            </div>
            <p className="text-4xs text-white/60 text-center pb-1">
              Mã bảo mật 3 chữ số phía sau thẻ (CVV / CVC).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
