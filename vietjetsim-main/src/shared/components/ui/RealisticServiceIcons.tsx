import React from 'react';

/**
 * Bộ Icon đồ họa vector thực tế (Realistic Airline & Service Icons)
 * thiết kế chuyên biệt cho hệ thống hàng không Vietjet Air.
 * Render sắc nét trên mọi độ phân giải (Retina, 4K, Mobile).
 */

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// 1. Icon Máy bay cất cánh / Đặt vé
export function FlightPlaneIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjPlaneGrad" x1="8" y1="40" x2="42" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="0.6" stopColor="#FF414D" />
          <stop offset="1" stopColor="#FFCC00" />
        </linearGradient>
        <filter id="vjPlaneShadow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#EC2029" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#vjPlaneShadow)">
        <path
          d="M41.5 8.2c-0.8-0.8-2.1-0.9-3 0.1L24.8 21.6 12.4 17.5c-1.3-0.4-2.7 0.1-3.4 1.2l-1.8 2.8c-0.5 0.8-0.3 1.8 0.4 2.4l10.2 7.7-4.6 5.8-5.3-0.6c-0.7-0.1-1.4 0.2-1.9 0.7l-1.5 1.7c-0.5 0.6-0.4 1.5 0.2 2l4.8 3.7c0.6 0.5 1.5 0.4 2-0.2l1.6-1.8c0.5-0.5 0.7-1.3 0.6-2l-0.7-5.3 5.9-4.5 7.9 10c0.6 0.8 1.6 1 2.4 0.5l2.8-1.8c1.1-0.7 1.6-2.1 1.2-3.4l-4-12.3 13.4-13.6c1-0.9 0.9-2.3 0.1-3.2z"
          fill="url(#vjPlaneGrad)"
        />
        <circle cx="36" cy="14" r="1.5" fill="#FFFFFF" opacity="0.9" />
        <path
          d="M21 26l-7-5.5 1.5-2.2 9.5 3.2-4 4.5z"
          fill="#FFFFFF"
          opacity="0.3"
        />
      </g>
    </svg>
  );
}

// 2. Icon Vali hành lý ký gửi Vietjet
export function BaggageLuggageIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjLuggageBody" x1="12" y1="14" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Retractable Handle */}
      <path
        d="M18 14V7c0-1.1 0.9-2 2-2h8c1.1 0 2 0.9 2 2v7"
        stroke="#4B5563"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Suitcase Body */}
      <rect x="11" y="13" width="26" height="30" rx="5" fill="url(#vjLuggageBody)" />
      {/* Corner protectors in charcoal */}
      <path d="M11 18c0-2.8 2.2-5 5-5h2v6h-7v-1z" fill="#7F1D1D" opacity="0.8" />
      <path d="M37 18c0-2.8-2.2-5-5-5h-2v6h7v-1z" fill="#7F1D1D" opacity="0.8" />
      {/* Sleek Aerodynamic Ribs / Grooves */}
      <line x1="18" y1="18" x2="18" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="24" y1="18" x2="24" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="30" y1="18" x2="30" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      {/* Signature Vietjet Yellow Luggage Tag */}
      <rect x="28" y="15" width="7" height="10" rx="1.5" fill="#FFCC00" stroke="#CA8A04" strokeWidth="0.5" />
      <circle cx="31.5" cy="17.5" r="0.8" fill="#B45309" />
      <line x1="30" y1="20" x2="33" y2="20" stroke="#B45309" strokeWidth="0.8" />
      <line x1="30" y1="22" x2="33" y2="22" stroke="#B45309" strokeWidth="0.8" />
      {/* 360-degree Spinner Wheels */}
      <circle cx="16" cy="44" r="2.5" fill="#1F2937" />
      <circle cx="16" cy="44" r="1" fill="#9CA3AF" />
      <circle cx="32" cy="44" r="2.5" fill="#1F2937" />
      <circle cx="32" cy="44" r="1" fill="#9CA3AF" />
    </svg>
  );
}

// 3. Icon Ghế ngồi máy bay Vietjet (Da cao cấp & Tựa đầu đỏ)
export function SeatArmchairIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjSeatBack" x1="14" y1="6" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      {/* Vietjet Signature Red Leather Antimacassar / Headrest */}
      <rect x="17" y="5" width="14" height="8" rx="3.5" fill="#EC2029" stroke="#B91C1C" strokeWidth="0.8" />
      <path d="M21 9h6" stroke="#FFCC00" strokeWidth="1.2" strokeLinecap="round" />
      {/* Ergonomic Backrest */}
      <path
        d="M17 14c-2.2 0-4 1.8-4 4v13c0 1.1 0.9 2 2 2h18c1.1 0 2-0.9 2-2V18c0-2.2-1.8-4-4-4H17z"
        fill="url(#vjSeatBack)"
      />
      {/* Padded Seat Cushion */}
      <rect x="12" y="30" width="24" height="6.5" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
      {/* Armrests */}
      <rect x="9" y="23" width="3.5" height="11" rx="1.75" fill="#64748B" />
      <rect x="35.5" y="23" width="3.5" height="11" rx="1.75" fill="#64748B" />
      {/* Seat Stand / Base */}
      <path d="M22 36.5v5.5h4v-5.5" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="17" y1="42" x2="31" y2="42" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      {/* Gold Airline Seatbelt Buckle */}
      <path d="M19 28.5h4" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="23" y="27.5" width="3" height="2" rx="0.5" fill="#FFCC00" />
      <path d="M26 28.5h3" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 4. Icon Suất ăn nóng & Đồ uống (Jet Café)
export function HotMealIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjClocheGrad" x1="10" y1="18" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Steam lines */}
      <path d="M20 9c-1 2 1 3 0 5" stroke="#EC2029" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      <path d="M24 7c-1 2.5 1 4 0 6" stroke="#EC2029" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M28 9c-1 2 1 3 0 5" stroke="#EC2029" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      {/* Gold Handle */}
      <circle cx="24" cy="18" r="2.5" fill="#FFCC00" />
      {/* Cover / Cloche */}
      <path
        d="M10 32c0-7.7 6.3-14 14-14s14 6.3 14 14H10z"
        fill="url(#vjClocheGrad)"
      />
      {/* Platter / Tray Base */}
      <rect x="7" y="32" width="34" height="3" rx="1.5" fill="#78350F" />
      <path d="M12 35l2 3h20l2-3" fill="#92400E" opacity="0.7" />
    </svg>
  );
}

// 5. Icon Online Check-in / Thẻ lên máy bay điện tử
export function OnlineCheckinIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjPhoneGrad" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      {/* Smartphone Body in Slate Titanium */}
      <rect x="12" y="6" width="24" height="36" rx="4.5" fill="url(#vjPhoneGrad)" stroke="#334155" strokeWidth="1" />
      {/* Screen */}
      <rect x="14" y="9.5" width="20" height="28" rx="2" fill="#FFFFFF" />
      {/* Speaker Bar */}
      <line x1="21" y1="7.8" x2="27" y2="7.8" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
      {/* Vietjet Red Boarding Pass Header */}
      <rect x="15" y="11" width="18" height="5" rx="1" fill="#EC2029" />
      <circle cx="17.5" cy="13.5" r="1" fill="#FFCC00" />
      <line x1="20" y1="13.5" x2="26" y2="13.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
      {/* QR Code / Barcode Pattern */}
      <rect x="18" y="18" width="12" height="12" rx="1.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
      <rect x="20" y="20" width="3" height="3" fill="#0F172A" />
      <rect x="25" y="20" width="3" height="3" fill="#0F172A" />
      <rect x="20" y="25" width="3" height="3" fill="#0F172A" />
      <rect x="25.5" y="25.5" width="2" height="2" fill="#0F172A" />
      {/* Verified Green Badge with Gold Rim */}
      <circle cx="34" cy="35" r="7" fill="#16A34A" stroke="#FFCC00" strokeWidth="1.5" />
      <path d="M31 35l2 2 4-4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 6. Icon Bảo hiểm du lịch Sky Care (Vietjet Red & Gold Protection)
export function SkyCareInsuranceIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjShieldGrad" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="0.6" stopColor="#DC2626" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Shield Base */}
      <path
        d="M24 5l14 5v12c0 11-6.2 18.5-14 21.5-7.8-3-14-10.5-14-21.5V10l14-5z"
        fill="url(#vjShieldGrad)"
      />
      {/* Outer Gold Crest Trim */}
      <path
        d="M24 7.5l11.5 4.2v9.8c0 9-4.8 15.3-11.5 17.8-6.7-2.5-11.5-8.8-11.5-17.8v-9.8L24 7.5z"
        stroke="#FFCC00"
        strokeWidth="1.4"
        fill="none"
      />
      {/* Inner lighter highlight */}
      <path
        d="M24 10l9 3.2v7.5c0 6.8-3.5 11.8-9 14-5.5-2.2-9-7.2-9-14v-7.5L24 10z"
        fill="#FFFFFF"
        opacity="0.1"
      />
      {/* Sky Care Golden Airplane Emblem */}
      <path
        d="M24 15l2.2 5.5 6 1.5-5 3.5 1.5 6-4.7-3.5-4.7 3.5 1.5-6-5-3.5 6-1.5L24 15z"
        fill="#FFCC00"
      />
      {/* Center White Safety Star */}
      <circle cx="24" cy="24" r="1.8" fill="#FFFFFF" />
    </svg>
  );
}

// 7. Icon SkyJoy - Tích & Đổi điểm thưởng
export function SkyJoyStarIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjSkyJoyGrad" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#EAB308" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
        <filter id="vjStarGlow" x="4" y="4" width="40" height="40" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* Big Star */}
      <g filter="url(#vjStarGlow)">
        <path
          d="M24 6l5.2 10.6 11.8 1.7-8.5 8.3 2 11.6L24 32.7l-10.5 5.5 2-11.6-8.5-8.3 11.8-1.7L24 6z"
          fill="url(#vjSkyJoyGrad)"
        />
        {/* Star highlights */}
        <polygon points="24,8 24,32 15,37 17,27 10,20 20,18" fill="#FEF08A" opacity="0.6" />
      </g>
      {/* Inner Sparkle Center */}
      <circle cx="24" cy="22" r="3" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

// 8. Icon Hàng miễn thuế Sky Shop Vietjet (Luxury Duty Free)
export function DutyFreeBagIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjDutyBag" x1="12" y1="14" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Luxury Gold Handles */}
      <path
        d="M18 16v-4c0-3.3 2.7-6 6-6s6 2.7 6 6v4"
        stroke="#FFCC00"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Bag Body */}
      <path
        d="M11 16l3 24c0.2 1.7 1.6 3 3.3 3h13.4c1.7 0 3.1-1.3 3.3-3l3-24H11z"
        fill="url(#vjDutyBag)"
      />
      {/* Gold Rim / Trim */}
      <path d="M11 16h26" stroke="#FFCC00" strokeWidth="1.5" />
      {/* Vietjet Gold Ribbon */}
      <path d="M21 16v27" stroke="#FFCC00" strokeWidth="2.2" />
      <path d="M27 16v27" stroke="#FFCC00" strokeWidth="2.2" />
      {/* Sky Shop Gold Star Badge */}
      <polygon points="24,24 25.5,27 29,27.5 26.5,29.8 27.2,33.2 24,31.4 20.8,33.2 21.5,29.8 19,27.5 22.5,27" fill="#FFCC00" />
      {/* Sparkles */}
      <path d="M15 22l0.8 1.5 1.5 0.8-1.5 0.8-0.8 1.5-0.8-1.5-1.5-0.8 1.5-0.8 0.8-1.5z" fill="#FEF08A" />
      <path d="M33 28l0.8 1.5 1.5 0.8-1.5 0.8-0.8 1.5-0.8-1.5-1.5-0.8 1.5-0.8 0.8-1.5z" fill="#FEF08A" />
    </svg>
  );
}

// 9. Icon Taxi / Xe đưa đón sân bay (Green SM & Vietjet Airport Transfer)
export function AirportTaxiIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjTaxiBody" x1="8" y1="18" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      {/* Yellow TAXI Roof Sign */}
      <rect x="20" y="9" width="8" height="3.5" rx="1" fill="#FFCC00" stroke="#CA8A04" strokeWidth="0.5" />
      <text x="24" y="11.8" fontSize="2.8" fontWeight="bold" fill="#0F172A" textAnchor="middle" fontFamily="sans-serif">
        TAXI
      </text>
      {/* Car Roof & Windshield */}
      <path
        d="M14 21l3-6.5c0.6-1.2 1.8-1.8 3.1-1.8h15.8c1.3 0 2.5 0.6 3.1 1.8l3 6.5H14z"
        fill="#047857"
      />
      {/* Windows */}
      <path d="M16.5 20.5l2.2-5h9.3v5H16.5z" fill="#D1FAE5" />
      <path d="M30 20.5v-5h7.5l2.2 5H30z" fill="#D1FAE5" />
      {/* Main Body */}
      <path
        d="M8 21.5c0-1.7 1.3-3 3-3h26c1.7 0 3 1.3 3 3v9.5c0 1.1-0.9 2-2 2h-1.5c-0.8-2.3-3-4-5.5-4s-4.7 1.7-5.5 4h-4c-0.8-2.3-3-4-5.5-4s-4.7 1.7-5.5 4H9c-1.1 0-2-0.9-2-2v-9.5z"
        fill="url(#vjTaxiBody)"
      />
      {/* Vietjet Red & Gold Racing Accent Stripe */}
      <rect x="9" y="27" width="30" height="1.8" fill="#EC2029" />
      <rect x="9" y="28.8" width="30" height="0.8" fill="#FFCC00" />
      {/* Headlights */}
      <rect x="8.5" y="23.5" width="4" height="3" rx="1.5" fill="#FEF08A" />
      <rect x="35.5" y="23.5" width="4" height="3" rx="1.5" fill="#FEF08A" />
      {/* Wheels */}
      <circle cx="16" cy="33" r="4.2" fill="#1E293B" />
      <circle cx="16" cy="33" r="2" fill="#94A3B8" />
      <circle cx="32" cy="33" r="4.2" fill="#1E293B" />
      <circle cx="32" cy="33" r="2" fill="#94A3B8" />
    </svg>
  );
}

// 10. Icon e-Voucher quà tặng Vietjet (Authentic Vietjet Red & Gold Voucher)
export function EvoucherGiftIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjVoucherGrad" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="0.6" stopColor="#DC2626" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Ticket Base with coupon notches */}
      <path
        d="M8 17c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4 0 1.7-1.3 3-3 3 1.7 0 3 1.3 3 3v8c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4v-8c0-1.7 1.3-3 3-3-1.7 0-3-1.3-3-3z"
        fill="url(#vjVoucherGrad)"
        stroke="#7F1D1D"
        strokeWidth="0.8"
      />
      {/* Gold dashed tear line */}
      <line x1="31" y1="15" x2="31" y2="33" stroke="#FFCC00" strokeWidth="1.8" strokeDasharray="2.5 2" strokeLinecap="round" />
      {/* Gold Discount Seal with % mark */}
      <circle cx="19" cy="24" r="6" fill="#FFCC00" stroke="#CA8A04" strokeWidth="0.8" />
      <text x="19" y="27.5" fontSize="8.5" fontWeight="900" fill="#991B1B" textAnchor="middle" fontFamily="sans-serif">
        %
      </text>
      {/* Small barcode right side */}
      <line x1="34" y1="18" x2="34" y2="30" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.9" />
      <line x1="36" y1="18" x2="36" y2="30" stroke="#FFCC00" strokeWidth="1.5" opacity="0.9" />
      <line x1="38.5" y1="18" x2="38.5" y2="30" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
      {/* Top tiny sparkle */}
      <polygon points="12,16 12.8,17.2 14,17.5 13,18.3 13.2,19.5 12,18.8 10.8,19.5 11,18.3 10,17.5 11.2,17.2" fill="#FFCC00" />
    </svg>
  );
}

// 11. Icon SkyKIDS — Trẻ em bay một mình
export function SkyKidsIcon({ size = 48, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjCapGrad" x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Pilot Cap */}
      <path d="M18 24c0-6.6 6.3-12 14-12s14 5.4 14 12v3H18v-3z" fill="url(#vjCapGrad)" />
      {/* Visor */}
      <path d="M14 27h36c0 2-8 5-18 5s-18-3-18-5z" fill="#1F2937" />
      {/* Gold Pilot Badge */}
      <circle cx="32" cy="20" r="4.5" fill="#FFCC00" />
      <path d="M32 17l1.5 2 2.5 0.5-2 1.5 0.5 2.5-2.5-1.5-2.5 1.5 0.5-2.5-2-1.5 2.5-0.5z" fill="#B45309" />
      {/* Kid Face */}
      <circle cx="32" cy="38" r="14" fill="#FED7AA" />
      {/* Cheeks blush */}
      <circle cx="23" cy="40" r="2.5" fill="#FCA5A5" opacity="0.7" />
      <circle cx="41" cy="40" r="2.5" fill="#FCA5A5" opacity="0.7" />
      {/* Happy Eyes */}
      <path d="M24 35c0.5-1.5 2.5-1.5 3 0" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      <path d="M37 35c0.5-1.5 2.5-1.5 3 0" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      {/* Big Smile */}
      <path d="M27 41c1.5 3 6.5 3 8 0" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round" />
      {/* Airplane wings pin on collar */}
      <path d="M22 54h20l-4 6H26l-4-6z" fill="#EC2029" />
      <polygon points="32,54 34,58 32,60 30,58" fill="#FFCC00" />
    </svg>
  );
}

// 12. Icon Thú cưng trên chuyến bay (Pet on board)
export function PetTravelIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjPetGrad" x1="12" y1="14" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Pet Carrier Bag */}
      <rect x="10" y="18" width="28" height="24" rx="6" fill="url(#vjPetGrad)" />
      {/* Mesh Breathing Window */}
      <circle cx="24" cy="30" r="7.5" fill="#FEF3C7" stroke="#92400E" strokeWidth="1.5" />
      {/* Paw Print Inside */}
      <ellipse cx="24" cy="32" rx="3" ry="2.2" fill="#78350F" />
      <circle cx="21" cy="28" r="1.3" fill="#78350F" />
      <circle cx="24" cy="27" r="1.3" fill="#78350F" />
      <circle cx="27" cy="28" r="1.3" fill="#78350F" />
      {/* Handle */}
      <path d="M19 18v-4c0-2.2 2.2-4 5-4s5 1.8 5 4v4" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      {/* Tag */}
      <circle cx="34" cy="22" r="2" fill="#EC2029" />
    </svg>
  );
}

// 13. Icon Check-in Ưu tiên / Fast Track (Priority Service)
export function PriorityFastTrackIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjPriorityGrad" x1="10" y1="10" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC2029" />
          <stop offset="1" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      {/* Red Carpet */}
      <path d="M16 42l4-24h8l4 24H16z" fill="url(#vjPriorityGrad)" />
      <line x1="24" y1="18" x2="24" y2="42" stroke="#FFCC00" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* Stanchions (VIP Gold Posts) */}
      <line x1="13" y1="22" x2="13" y2="38" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
      <circle cx="13" cy="21" r="2.5" fill="#FFCC00" />
      <rect x="11" y="38" width="4" height="2" rx="0.5" fill="#CA8A04" />

      <line x1="35" y1="22" x2="35" y2="38" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
      <circle cx="35" cy="21" r="2.5" fill="#FFCC00" />
      <rect x="33" y="38" width="4" height="2" rx="0.5" fill="#CA8A04" />
      {/* Velvet Rope */}
      <path d="M13 22c5 4 8 4 11 0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M24 22c3 4 8 4 11 0" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* SkyBoss / VIP Crown / Star */}
      <polygon points="24,6 26.5,12 32,8 30,15 18,15 16,8 21.5,12" fill="#FFCC00" stroke="#CA8A04" strokeWidth="0.8" />
    </svg>
  );
}

// 14. Icon Phòng chờ thương gia (Business Lounge)
export function BusinessLoungeIcon({ size = 32, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjLoungeGrad" x1="10" y1="12" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      {/* Luxury Club Armchair */}
      <path
        d="M14 16c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v16H14V16z"
        fill="url(#vjLoungeGrad)"
      />
      {/* Red Vietjet Cushion Accents */}
      <rect x="17" y="14" width="14" height="4" rx="2" fill="#EC2029" />
      {/* Padded Seat Cushion */}
      <rect x="12" y="27" width="24" height="6" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
      {/* Armrests */}
      <rect x="10" y="22" width="4" height="10" rx="2" fill="#64748B" />
      <rect x="34" y="22" width="4" height="10" rx="2" fill="#64748B" />
      {/* Legs */}
      <line x1="14" y1="33" x2="12" y2="40" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="33" x2="36" y2="40" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
      {/* Lounge Pedestal Table with Wine / Coffee */}
      <line x1="41" y1="26" x2="41" y2="38" stroke="#CA8A04" strokeWidth="1.5" />
      <ellipse cx="41" cy="26" rx="4" ry="1.5" fill="#475569" />
      {/* Wine Glass on table */}
      <path d="M40 21v3h2v-3h-2z" fill="#94A3B8" />
      <path d="M39.5 21c0 1.5 1.5 2.5 1.5 2.5s1.5-1 1.5-2.5h-3z" fill="#EF4444" opacity="0.8" />
      <line x1="41" y1="24" x2="41" y2="26" stroke="#94A3B8" strokeWidth="0.8" />
      {/* Warm Ambient Lamp */}
      <path d="M7 16l3-6h2l3 6H7z" fill="#FEF08A" opacity="0.8" />
      <line x1="11" y1="16" x2="11" y2="38" stroke="#CA8A04" strokeWidth="1.2" />
    </svg>
  );
}

// 15. Icon Thẻ tín dụng & Thanh toán thực tế (Realistic Credit Card Payment)
export function CreditCardPaymentIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="vjCardGrad" x1="0" y1="0" x2="48" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="0.5" stopColor="#334155" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="vjChipGrad" x1="8" y1="14" x2="16" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Card Body */}
      <rect x="2" y="2" width="44" height="32" rx="4" fill="url(#vjCardGrad)" stroke="#475569" strokeWidth="1" />
      {/* Magnetic stripe accent */}
      <rect x="2" y="8" width="44" height="6" fill="#020617" />
      {/* Gold EMV Chip */}
      <rect x="7" y="17" width="9" height="7" rx="1.5" fill="url(#vjChipGrad)" stroke="#B45309" strokeWidth="0.5" />
      <line x1="11.5" y1="17" x2="11.5" y2="24" stroke="#92400E" strokeWidth="0.5" />
      <line x1="7" y1="20.5" x2="16" y2="20.5" stroke="#92400E" strokeWidth="0.5" />
      {/* Card logo circles */}
      <circle cx="37" cy="24" r="5" fill="#EF4444" opacity="0.85" />
      <circle cx="32" cy="24" r="5" fill="#F59E0B" opacity="0.85" />
      {/* Embossed dots */}
      <circle cx="8" cy="28" r="0.75" fill="#CBD5E1" />
      <circle cx="11" cy="28" r="0.75" fill="#CBD5E1" />
      <circle cx="14" cy="28" r="0.75" fill="#CBD5E1" />
      <circle cx="17" cy="28" r="0.75" fill="#CBD5E1" />
    </svg>
  );
}

// 16. Minh họa món ăn thực tế (Realistic Culinary Dish Illustration)
export function MealDishIllustration({ mealId, size = 64, className = '' }: { mealId: string; size?: number; className?: string }) {
  switch (mealId) {
    case 'meal-my-y':
      // Mỳ Ý sốt bò bằm (Spaghetti Bolognese)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <radialGradient id="vjPlateGrad1" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          {/* Porcelain Plate */}
          <ellipse cx="32" cy="35" rx="28" ry="21" fill="url(#vjPlateGrad1)" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="32" cy="35" rx="22" ry="16" fill="#F8FAFC" />
          {/* Swirled Pasta */}
          <path d="M18 35c2-6 8-10 14-10s12 4 14 10c-3 5-9 8-14 8s-11-3-14-8z" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
          <path d="M22 34c3-3 7-4 10-3 4 1 7 4 8 3" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M24 38c3-2 6-2 9-1 3 1 5 3 6 2" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
          {/* Rich Bolognese Meat Sauce */}
          <ellipse cx="32" cy="34" rx="10" ry="7" fill="#DC2626" />
          <ellipse cx="31" cy="33" rx="7" ry="5" fill="#B91C1C" />
          <circle cx="28" cy="32" r="1.5" fill="#7F1D1D" />
          <circle cx="34" cy="33" r="1.5" fill="#7F1D1D" />
          <circle cx="31" cy="36" r="1.5" fill="#7F1D1D" />
          {/* Basil garnish */}
          <path d="M32 28c-2-3-4-2-4 0 1 2 3 2 4 0z" fill="#16A34A" />
          <path d="M33 28c2-3 4-2 4 0-1 2-3 2-4 0z" fill="#22C55E" />
          {/* Parmesan specs */}
          <circle cx="29" cy="35" r="0.8" fill="#FEF08A" />
          <circle cx="35" cy="36" r="0.8" fill="#FEF08A" />
          <circle cx="32" cy="31" r="0.8" fill="#FEF08A" />
          {/* Fork */}
          <path d="M52 20l-6 10m2-11l-5 9m-1-8l-5 7" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );

    case 'meal-com-chien-thai':
      // Cơm chiên Thái hải sản & tôm (Thai Seafood Fried Rice)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <radialGradient id="vjPlateGrad2" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          <ellipse cx="32" cy="35" rx="28" ry="21" fill="url(#vjPlateGrad2)" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="32" cy="35" rx="22" ry="16" fill="#F8FAFC" />
          {/* Fried Rice Dome */}
          <ellipse cx="30" cy="35" rx="16" ry="12" fill="#FBBF24" />
          <ellipse cx="30" cy="34" rx="13" ry="9" fill="#F59E0B" />
          {/* Peas & carrots & scallions */}
          <circle cx="25" cy="32" r="1.5" fill="#16A34A" />
          <circle cx="33" cy="35" r="1.5" fill="#16A34A" />
          <circle cx="29" cy="38" r="1.5" fill="#16A34A" />
          <rect x="27" y="34" width="2.5" height="2.5" rx="0.5" fill="#EA580C" />
          <rect x="34" y="32" width="2.5" height="2.5" rx="0.5" fill="#EA580C" />
          {/* Plump Tiger Shrimp */}
          <path d="M33 26c4-1 8 1 9 4-1 2-3 2-5 1l-4-5z" fill="#F87171" stroke="#EF4444" strokeWidth="1" />
          <circle cx="40" cy="29" r="0.7" fill="#7F1D1D" />
          {/* Cucumber slices & lime wedge */}
          <ellipse cx="43" cy="40" rx="4" ry="6" fill="#86EFAC" stroke="#16A34A" strokeWidth="1" transform="rotate(30 43 40)" />
          <path d="M17 38c3-4 6-2 6 2l-6-2z" fill="#BEF264" stroke="#65A30D" strokeWidth="1" />
        </svg>
      );

    case 'meal-mien-xao-tom-cua':
      // Miến xào Tôm Cua (Glass Noodles with Shrimp & Crab)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <radialGradient id="vjPlateGrad3" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          <ellipse cx="32" cy="35" rx="28" ry="21" fill="url(#vjPlateGrad3)" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="32" cy="35" rx="22" ry="16" fill="#F8FAFC" />
          {/* Glass Noodles */}
          <ellipse cx="32" cy="35" rx="16" ry="11" fill="#FEF08A" opacity="0.9" />
          <path d="M20 33c3-3 7 1 11-1 4-2 8 0 11 2" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M22 36c4 0 7-3 11-1 3 1 6 3 9 1" stroke="#EAB308" strokeWidth="1.2" strokeLinecap="round" />
          {/* Wood ear mushroom */}
          <path d="M26 38c2-2 4-1 5 1-2 1-4 0-5-1z" fill="#451A03" />
          <path d="M36 33c1-2 3-1 3 1-1 1-3 0-3-1z" fill="#451A03" />
          {/* Crab Meat Flakes */}
          <ellipse cx="29" cy="33" rx="3" ry="1.5" fill="#FCA5A5" />
          <ellipse cx="34" cy="36" rx="3.5" ry="1.8" fill="#FCA5A5" />
          {/* Fresh Jumbo Shrimp */}
          <path d="M31 27c3-2 6 0 7 2-1 2-3 2-4 1l-3-3z" fill="#FB7185" stroke="#E11D48" strokeWidth="1" />
          {/* Cilantro Sprig */}
          <path d="M28 29c-1-2-2-1-2 0 1 1 2 1 2 0z" fill="#15803D" />
          <path d="M30 30c0-2 2-2 2 0-1 1-2 1-2 0z" fill="#22C55E" />
        </svg>
      );

    case 'meal-bun-xao-singapore':
      // Bún xào Singapore cà ri thơm lừng (Singapore Curry Rice Vermicelli)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <radialGradient id="vjPlateGrad4" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          <ellipse cx="32" cy="35" rx="28" ry="21" fill="url(#vjPlateGrad4)" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="32" cy="35" rx="22" ry="16" fill="#F8FAFC" />
          {/* Yellow Curry Rice Vermicelli */}
          <ellipse cx="32" cy="35" rx="16" ry="11" fill="#FACC15" />
          <path d="M21 34c4-2 7 2 11 0s7-2 11 1" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M23 37c3-1 6-2 10 0 3 1 6-1 8 1" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
          {/* Red BBQ Char Siu Slices */}
          <rect x="25" y="32" width="6" height="2.5" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" transform="rotate(-15 25 32)" />
          <rect x="33" y="35" width="6" height="2.5" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5" transform="rotate(10 33 35)" />
          {/* Bell pepper slivers */}
          <path d="M28 36c1-2 3-2 4 0" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M32 32c1-1 3-1 4 0" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" />
          {/* Bamboo Chopsticks */}
          <line x1="45" y1="18" x2="25" y2="48" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="48" y1="19" x2="28" y2="50" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'meal-com-chien-duong-chau':
      // Cơm chiên Dương Châu chay (Yangzhou Vegetarian Fried Rice)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <radialGradient id="vjPlateGrad5" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          <ellipse cx="32" cy="35" rx="28" ry="21" fill="url(#vjPlateGrad5)" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="32" cy="35" rx="22" ry="16" fill="#F8FAFC" />
          {/* Fragrant Vegetarian Rice Mound */}
          <ellipse cx="32" cy="35" rx="16" ry="11" fill="#FEF08A" />
          <ellipse cx="32" cy="34" rx="13" ry="9" fill="#FDE047" />
          {/* Diced Golden Tofu */}
          <rect x="25" y="33" width="3" height="3" rx="0.5" fill="#D97706" />
          <rect x="34" y="32" width="3" height="3" rx="0.5" fill="#D97706" />
          <rect x="31" y="37" width="3" height="3" rx="0.5" fill="#D97706" />
          {/* Sweet Green Peas */}
          <circle cx="28" cy="31" r="1.3" fill="#15803D" />
          <circle cx="36" cy="36" r="1.3" fill="#15803D" />
          <circle cx="27" cy="37" r="1.3" fill="#15803D" />
          {/* Shiitake Mushroom Bits */}
          <ellipse cx="30" cy="35" rx="2" ry="1.2" fill="#451A03" />
          <ellipse cx="35" cy="34" rx="1.8" ry="1" fill="#451A03" />
          {/* Sweet Corn */}
          <circle cx="32" cy="33" r="1.2" fill="#F59E0B" />
          <circle cx="29" cy="39" r="1.2" fill="#F59E0B" />
          {/* Fresh Parsley */}
          <path d="M32 28c-1-2-3-1-2 1 1 1 2 0 1-1z" fill="#16A34A" />
        </svg>
      );

    case 'meal-xoi-khuc-gio':
      // Xôi khúc giò truyền thống (Traditional Sticky Rice & Vietnamese Bologna)
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
          <defs>
            <radialGradient id="vjPlateGrad6" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          <ellipse cx="32" cy="35" rx="28" ry="21" fill="url(#vjPlateGrad6)" stroke="#CBD5E1" strokeWidth="1.5" />
          <ellipse cx="32" cy="35" rx="22" ry="16" fill="#F8FAFC" />
          {/* Banana Leaf Base */}
          <path d="M19 36c4-7 14-8 23-4 3 6-2 13-10 13-8 0-14-4-13-9z" fill="#4ADE80" opacity="0.6" stroke="#16A34A" strokeWidth="0.8" />
          {/* Xôi Khúc Dome (cudweed sticky rice dumpling) */}
          <ellipse cx="29" cy="34" rx="9" ry="7" fill="#86EFAC" stroke="#16A34A" strokeWidth="1" />
          {/* White glutinous rice grains coating */}
          <ellipse cx="29" cy="33" rx="7" ry="5.5" fill="#DCFCE7" />
          <circle cx="26" cy="32" r="1.2" fill="#FFFFFF" />
          <circle cx="30" cy="31" r="1.2" fill="#FFFFFF" />
          <circle cx="29" cy="34" r="1.2" fill="#FFFFFF" />
          <circle cx="32" cy="33" r="1.2" fill="#FFFFFF" />
          {/* Fried Shallots Crisps */}
          <ellipse cx="28" cy="33" rx="1.5" ry="0.6" fill="#B45309" transform="rotate(25 28 33)" />
          <ellipse cx="31" cy="32" rx="1.5" ry="0.6" fill="#92400E" transform="rotate(-15 31 32)" />
          {/* Sliced Giò Lụa (Pork Bologna) */}
          <ellipse cx="40" cy="36" rx="6" ry="4.5" fill="#FED7AA" stroke="#FB923C" strokeWidth="1" transform="rotate(15 40 36)" />
          <ellipse cx="40" cy="36" rx="4.5" ry="3" fill="#FFEDD5" transform="rotate(15 40 36)" />
          <circle cx="39" cy="35" r="0.6" fill="#1C1917" />
          <circle cx="41" cy="37" r="0.6" fill="#1C1917" />
        </svg>
      );

    default:
      return <HotMealIcon size={size} className={className} />;
  }
}


