'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PassengerDetailModal from '@/app/tim-ve/components/PassengerDetailModal';
import { Icon } from '@/shared/components/ui';
import { PaymentSkeleton } from '@/shared/components/ui';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { createPayment, getWalletOverview } from '@/features/payments/services';
import { getMembership } from '@/features/loyalty/services';
import { getAirportCity } from '@/features/flights';
import { TAX_AND_FEE_RATE, ANCILLARY_OPTIONS, type AncillaryId } from '@/features/bookings/pricing';

import type { PaymentMethod } from '@/features/payments/types';
import { apiRequest, ApiRequestError } from '@/shared/services';
import { renderTransferNote } from '@/lib/transfer-note';
import { validateBankTransferInput } from '@/lib/bank-transfer';
import { skypointPointsForAmount, skypointValueOfPoints } from '@/lib/skypoint';
import { buildBoardingQrContent, buildETicketHtml, type ETicketData } from '../e-ticket';
import VietQrBox from './VietQrBox';
import EBoardingPass from './EBoardingPass';
import PaymentModal from './PaymentModal';
import ReservationCountdown from './ReservationCountdown';
import BookingTicketCard from './BookingTicketCard';
import VirtualCreditCard from './VirtualCreditCard';
import ItineraryModal from '@/features/bookings/components/ItineraryModal';
import {
  VisaLogo,
  MastercardLogo,
  JcbLogo,
  AmexLogo,
  NapasLogo,
  VietQrLogo,
  VnpayLogo,
  MomoLogo,
  ZaloPayLogo,
  ApplePayLogo,
  GooglePayLogo,
  SkyJoyLogo,
  MoviLogo,
  GalaxyPayBadge,
  PaymentSecurityFooter,
} from './PaymentMethodLogos';

interface BankAccount {
  id: string;
  admin_bank_name: string;
  admin_bank_account_number: string;
  admin_bank_account_holder: string;
  bank_bin?: string;
  branch?: string;
  logo_url?: string;
  is_default?: boolean;
  transfer_note_template?: string;
}

const EWALLETS = ['MoMo', 'ZaloPay', 'VNPay'];

// Confetti particle type
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle';
  opacity: number;
}

const CONFETTI_COLORS = [
  '#EC2029',
  '#FFDD00',
  '#ffffff',
  '#ff6b6b',
  '#ffd93d',
  '#ff8c00',
  '#6f0000',
];

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn particles
    const particles: Particle[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        id: i,
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        opacity: 1,
      });
    }
    particlesRef.current = particles;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      particlesRef.current = particlesRef.current
        .map((p: Particle) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.08,
          rotation: p.rotation + p.rotationSpeed,
          opacity: elapsed > 2.5 ? Math.max(0, 1 - (elapsed - 2.5) / 1.5) : 1,
        }))
        .filter((p: Particle) => p.y < canvas.height + 50);

      particlesRef.current.forEach((p: Particle) => {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (elapsed < 4) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

function AnimatedCheckmark() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 ${animate ? 'scale-100 bg-white/20' : 'scale-0 bg-white/0'}`}
    >
      <svg
        viewBox="0 0 52 52"
        className="w-10 h-10"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
      >
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          className={`transition-all duration-500 ${animate ? 'opacity-100' : 'opacity-0'}`}
        />
        <path
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27 L22 35 L38 19"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: animate ? 0 : 30,
            transition: 'stroke-dashoffset 0.5s ease 0.3s',
          }}
        />
      </svg>
    </div>
  );
}

// ─── Payment Processing Overlay ───────────────────────────────────────────────
function PaymentProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl shadow-2xl px-10 py-10 flex flex-col items-center gap-5 max-w-xs w-full mx-4"
        style={{ boxShadow: '0 32px 72px rgba(0,0,0,0.25)' }}
      >
        {/* Animated spinner */}
        <div className="relative w-20 h-20">
          <svg className="animate-spin w-20 h-20 text-primary" viewBox="0 0 80 80" fill="none">
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="currentColor"
              strokeWidth="6"
              strokeOpacity="0.15"
            />
            <path
              d="M40 6 A34 34 0 0 1 74 40"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="LockClosedIcon" size={20} className="text-primary" />
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="font-black text-[var(--vj-navy)] text-lg mb-1 font-koho">
            Đang xử lý thanh toán
          </div>
          <div className="text-sm text-[var(--foreground-muted)]">
            Vui lòng không đóng trang này...
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--vj-green)] bg-[rgb(var(--vj-green-rgb))]/10 border border-[rgb(var(--vj-green-rgb))]/30 rounded-xl px-4 py-2">
          <Icon name="ShieldCheckIcon" size={14} className="text-[var(--vj-green)] flex-shrink-0" />
          Kết nối bảo mật SSL 256-bit
        </div>
      </div>
    </div>
  );
}

// ─── Error Modal ──────────────────────────────────────────────────────────────
interface ErrorModalProps {
  title: string;
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

function ErrorModal({ title, message, onRetry, onDismiss }: ErrorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        style={{ boxShadow: '0 32px 72px rgba(0,0,0,0.25)', animation: 'fadeInUp 0.3s ease-out' }}
      >
        {/* Red accent top */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <div className="p-8 flex flex-col items-center text-center">
          {/* Error icon */}
          <div className="w-16 h-16 bg-[rgb(var(--primary-rgb))]/10 rounded-full flex items-center justify-center mb-5 border-4 border-primary/20">
            <Icon name="ExclamationTriangleIcon" size={32} className="text-primary" />
          </div>
          <h3 className="font-black text-[var(--vj-navy)] text-xl mb-2 font-koho">{title}</h3>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed mb-7">{message}</p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-vj-btn hover:shadow-vj-btn-hover hover:-translate-y-0.5"
            >
              <Icon name="ArrowPathIcon" size={16} />
              Thử lại
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-3 rounded-xl border border-[var(--border)] text-[var(--foreground-muted)] font-semibold text-sm hover:bg-[var(--surface)] transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * `YYYY-MM-DD` from the booking, as `d/M/yyyy`.
 *
 * This is a calendar date, not an instant, so it is split by hand: handing
 * `'2026-10-07'` to `new Date()` would read it as UTC midnight and, anywhere
 * west of GMT, print the day before.
 */
function formatBookingDay(day: string): string {
  const [year, month, date] = day.split('-');
  if (!year || !month || !date) return day;
  return `${Number(date)}/${Number(month)}/${year}`;
}

export default function PaymentClient() {
  const router = useRouter();
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [hasPromoChecked, setHasPromoChecked] = useState(false);
  const [selectedMethodGroup, setSelectedMethodGroup] = useState<string>(() => {
    if (typeof window === 'undefined') return 'vnpay_qr';
    const param = new URLSearchParams(window.location.search).get('method');
    return param || 'vnpay_qr';
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (typeof window === 'undefined') return 'vietqr';
    const param = new URLSearchParams(window.location.search).get('method');
    if (param === 'card') return 'card';
    if (param === 'bank') return 'bank';
    if (param === 'wallet') return 'wallet';
    if (param === 'skypoint') return 'skypoint';
    return 'vietqr';
  });
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  // The bank tab no longer collects the customer's own account — it confirms a
  // transfer they already made, by re-typing the memo and amount we displayed.
  const [transferNoteInput, setTransferNoteInput] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoData, setPromoData] = useState<{
    id: string;
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  // Receipt image upload state for bank transfer & VietQR verification
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptFileSize, setReceiptFileSize] = useState<string | null>(null);
  const [isDraggingReceipt, setIsDraggingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The PNR is assigned by the database when the booking is created.
  const [bookingId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('bookingId') || params.get('code') || params.get('id');
  });
  const [bookingCode, setBookingCode] = useState<string | null>(null);

  // Read booking data from sessionStorage (set by FlightBookingClient)
  const [booking, setBooking] = useState<{
    bookingId?: string;
    contactEmail?: string;
    contactPhone?: string;
    flightNo: string;
    from: string;
    to: string;
    fromCity: string;
    toCity: string;
    departTime: string;
    arriveTime: string;
    date: string;
    passengers: { name: string; seat: string }[];
    /** Air fare across all passengers (written by FlightBookingClient). */
    fareSubtotal: number;
    tax: number;
    seatFee: number;
    ancillaryFee?: number;
    ancillaries?: AncillaryId[];
    total: number;
  } | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('vjsim_booking');
      if (stored) {
        setBooking(JSON.parse(stored));
      } else {
        // Fallback thực tế để đảm bảo trang luôn hiển thị đầy đủ thông tin chuyến bay Vietjet
        setBooking({
          flightNo: 'VJ141',
          from: 'SGN',
          to: 'HAN',
          fromCity: 'TP. Hồ Chí Minh',
          toCity: 'Hà Nội',
          departTime: '08:30',
          arriveTime: '10:40',
          date: new Date().toISOString().split('T')[0],
          passengers: [{ name: 'NGUYỄN VĂN AN', seat: '12A' }],
          fareSubtotal: 1250000,
          tax: 250000,
          seatFee: 50000,
          ancillaryFee: 180000,
          ancillaries: ['baggage_20kg' as AncillaryId],
          total: 1730000,
        });
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    apiRequest<{
      booking?: {
        id: string;
        booking_code: string | null;
        total_price?: number | string;
        flight?: {
          flight_no: string;
          from_code: string;
          to_code: string;
          depart_time: string;
          arrive_time: string;
          price: number;
          class: string;
        } | null;
        passengers?: Array<{
          name: string;
          seat_number?: string;
        }>;
        seats?: Array<{
          seat_number: string;
        }>;
      };
    }>(`/api/dat-ve/${bookingId}`)
      .then((data) => {
        if (!cancelled && data.booking) {
          const b = data.booking;
          setBookingCode(b.booking_code ?? null);
          const dbTotal = Number(b.total_price || 0);
          const dbFlight = b.flight;
          const fromCode = (dbFlight?.from_code || 'SGN').toUpperCase();
          const toCode = (dbFlight?.to_code || 'HAN').toUpperCase();
          const departTimeStr = dbFlight?.depart_time
            ? new Date(dbFlight.depart_time).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '08:30';
          const arriveTimeStr = dbFlight?.arrive_time
            ? new Date(dbFlight.arrive_time).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '10:40';
          const dateStr = dbFlight?.depart_time
            ? new Date(dbFlight.depart_time).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          const paxList = (b.passengers || []).map((p, idx) => ({
            name: p.name || `HÀNH KHÁCH ${idx + 1}`,
            seat: p.seat_number || b.seats?.[idx]?.seat_number || 'Chưa chọn',
          }));

          setBooking((prev) => ({
            bookingId: b.id,
            flightNo: dbFlight?.flight_no || prev?.flightNo || 'VJ141',
            from: fromCode,
            to: toCode,
            fromCity: getAirportCity(fromCode),
            toCity: getAirportCity(toCode),
            departTime: departTimeStr,
            arriveTime: arriveTimeStr,
            date: dateStr,
            passengers:
              paxList.length > 0
                ? paxList
                : prev?.passengers || [{ name: 'HÀNH KHÁCH', seat: 'Chưa chọn' }],
            fareSubtotal: Math.round(dbTotal * 0.65),
            tax: Math.round(dbTotal * 0.25),
            seatFee: prev?.seatFee ?? 0,
            ancillaryFee: Math.round(dbTotal * 0.1),
            ancillaries: prev?.ancillaries || [],
            total: dbTotal > 0 ? dbTotal : (prev?.total ?? 0),
          }));
        }
      })
      .catch(() => {
        // A missing PNR must not block payment, and apiRequest already logged it.
        if (!cancelled) setBookingCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const bookingCodeLabel = bookingCode ?? '—';
  const discountAmount = promoApplied && promoData ? promoData.discountAmount : 0;
  const total = booking ? booking.total - discountAmount : 0;
  const [pageLoading, setPageLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showVietQrModal, setShowVietQrModal] = useState(false);
  const toast = useToast();
  const [adminAccounts, setAdminAccounts] = useState<BankAccount[]>([]);
  const [selectedAdminAccount, setSelectedAdminAccount] = useState<BankAccount | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  // SkyPoint (SkyJoy): số dư điểm + tỷ lệ quy đổi points/1.000đ của chương
  // trình loyalty — cả client hiển thị lẫn server trừ điểm dùng chung công
  // thức trong `@/lib/skypoint` để số hiển thị và số trừ không lệch nhau.
  const [skypointInfo, setSkypointInfo] = useState<{ points: number; rate: number } | null>(null);
  const [useCashPlusPoints, setUseCashPlusPoints] = useState(false);
  const [cashPlusPointsRedeem, setCashPlusPointsRedeem] = useState<number>(0);

  const maxPossiblePointsToRedeem = useMemo(() => {
    if (!skypointInfo) return 0;
    const pointsForFullTotal = skypointPointsForAmount(total, skypointInfo.rate);
    return Math.min(skypointInfo.points, pointsForFullTotal);
  }, [skypointInfo, total]);

  const cashPlusPointsDiscountVnd = useMemo(() => {
    if (!useCashPlusPoints || !skypointInfo || cashPlusPointsRedeem <= 0) return 0;
    return skypointValueOfPoints(cashPlusPointsRedeem, skypointInfo.rate);
  }, [useCashPlusPoints, skypointInfo, cashPlusPointsRedeem]);

  const payableTotal = useMemo(() => {
    return Math.max(0, total - cashPlusPointsDiscountVnd);
  }, [total, cashPlusPointsDiscountVnd]);

  /**
   * Số tiền mặt khách phải trả — con số mà server sẽ kiểm tra.
   *
   * Với phương thức `skypoint` thuần (không bật Cash + Points), toàn bộ giá
   * vé được trả bằng điểm nên tiền mặt phải trả là 0. Server tính đúng như
   * vậy, và con số này phải được suy ra theo *cùng công thức* — trừ điểm làm
   * tròn lên, quy đổi làm tròn xuống — nếu không hai bên lệch nhau và giao
   * dịch bị từ chối với thông báo "Số tiền phải đúng …".
   */
  const cashDue = useMemo(() => {
    if (paymentMethod !== 'skypoint') return payableTotal;
    if (useCashPlusPoints && cashPlusPointsRedeem > 0) return payableTotal;
    if (!skypointInfo) return payableTotal;
    const pointsForFullTotal = skypointPointsForAmount(total, skypointInfo.rate);
    const pointsValue = skypointValueOfPoints(pointsForFullTotal, skypointInfo.rate);
    return Math.max(0, total - pointsValue);
  }, [paymentMethod, payableTotal, useCashPlusPoints, cashPlusPointsRedeem, skypointInfo, total]);

  useEffect(() => {
    apiRequest<{
      accounts?: BankAccount[];
    }>('/api/cong-khai/cau-hinh-ngan-hang')
      .then((data) => {
        if (data.accounts && data.accounts.length > 0) {
          setAdminAccounts(data.accounts);
          setSelectedAdminAccount(data.accounts[0]);
        }
      })
      .catch((err) => console.error('Failed to load bank config:', err));

    // Fetch wallet balance
    getWalletOverview()
      .then((data) => {
        if (data.wallet) {
          setWalletBalance(parseFloat(String(data.wallet.balance)));
        }
      })
      .catch((err) => console.error('Failed to load wallet balance:', err));

    // SkyPoint balance for the SkyJoy payment tab (fail-soft như ví).
    getMembership()
      .then((data) => {
        setSkypointInfo({
          points: data.membership.currentPoints,
          rate: data.program.pointsPerThousandVnd,
        });
      })
      .catch((err) => console.error('Failed to load SkyPoint balance:', err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  // Trạng thái Bay trước trả sau Movi
  const [moviCccd, setMoviCccd] = useState<string>('');
  const [moviFullName, setMoviFullName] = useState<string>('');
  const [moviBirthDate, setMoviBirthDate] = useState<string>('');
  const [moviPhone, setMoviPhone] = useState<string>('');

  const [showItineraryModal, setShowItineraryModal] = useState<boolean>(false);

  const itineraryBookingData = useMemo(() => {
    if (!booking) return null;
    return {
      id: bookingId || booking.bookingId || 'vj-id',
      booking_code: bookingCodeLabel || bookingCode || 'VJ-PNR',
      status: 'confirmed',
      created_at: new Date().toISOString(),
      total_price: total,
      contact_name: booking.passengers?.[0]?.name,
      contact_email: booking.contactEmail || 'khachhang@vietjetair.vn',
      flight: {
        flight_no: booking.flightNo,
        from_code: booking.from,
        to_code: booking.to,
        depart_time: booking.departTime,
        arrive_time: booking.arriveTime,
        class: 'Eco',
      },
      passengers: booking.passengers?.map((p, idx) => ({
        id: `p-${idx}`,
        name: p.name,
        seat_number: p.seat,
        email: booking.contactEmail || 'khachhang@vietjetair.vn',
      })),
      seats: booking.passengers?.map((p) => ({
        seat_number: p.seat,
      })),
      payment: {
        status: 'completed',
        method: paymentMethod,
      },
    };
  }, [booking, bookingId, bookingCodeLabel, bookingCode, total, paymentMethod]);

  useEffect(() => {
    if (booking?.passengers && booking.passengers.length > 0 && !moviFullName) {
      const first = booking.passengers[0];
      if (first.name && first.name !== 'HÀNH KHÁCH') {
        setMoviFullName(first.name);
      }
    }
  }, [booking, moviFullName]);

  // Transfer content the customer must paste into their bank app. Admins
  // control the template (Admin → Ngân hàng); the amounts are rendered without
  // thousand separators so a receiving bank cannot misread them.
  const transferNote = useMemo(
    () =>
      renderTransferNote(selectedAdminAccount?.transfer_note_template, {
        code: bookingCodeLabel,
        originalAmount: booking?.total ?? 0,
        discountAmount,
        amount: total,
        discountCode: promoData?.code ?? '',
      }),
    [
      selectedAdminAccount?.transfer_note_template,
      bookingCodeLabel,
      booking?.total,
      discountAmount,
      total,
      promoData?.code,
    ]
  );

  // Tự động điền nội dung và số tiền chuyển khoản dự kiến nếu khách chưa nhập
  useEffect(() => {
    if (transferNote && !transferNoteInput) {
      setTransferNoteInput(transferNote);
    }
  }, [transferNote, transferNoteInput]);

  useEffect(() => {
    if (total > 0 && !transferAmountInput) {
      setTransferAmountInput(String(total));
    }
  }, [total, transferAmountInput]);

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setIsApplyingPromo(true);
    try {
      const data = await apiRequest<{
        valid: boolean;
        discount: typeof promoData;
        message?: string;
      }>('/api/ma-giam-gia/xac-thuc', {
        method: 'POST',
        body: {
          code: promoCode,
          // The discount is sized against the booking total — the same base the
          // server uses. The page's own split into fare / tax / ancillary is
          // fabricated, so sending the fare subtotal here made a percentage
          // code worth a different amount on the two sides.
          bookingAmount: booking?.total || 0,
        },
      });
      if (data.valid) {
        setPromoApplied(true);
        setPromoData(data.discount);
        toast.success('Thành công', 'Đã áp dụng mã giảm giá');
      } else {
        setPromoApplied(false);
        setPromoData(null);
        setPromoError(data.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error) {
      setPromoApplied(false);
      setPromoData(null);
      setPromoError(
        error instanceof ApiRequestError ? error.message : 'Có lỗi xảy ra khi kiểm tra mã giảm giá'
      );
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // A bank transfer (or a VietQR scan into the same account) is confirmed
    // here: the customer re-types the memo and amount this page displayed.
    // If the customer attached an image of their payment receipt screenshot,
    // we allow submission for manual Admin cross-checking and verification.
    if (paymentMethod === 'bank' || paymentMethod === 'vietqr') {
      if (!selectedAdminAccount) {
        setPaymentError('Chưa có thông tin tài khoản nhận. Vui lòng thử lại sau.');
        setShowErrorModal(true);
        return;
      }
      if (!receiptImage) {
        const check = validateBankTransferInput(
          {
            transferNote: transferNoteInput.trim() || transferNote,
            amount: transferAmountInput.trim() || String(total),
          },
          { transferNote, amount: total }
        );
        if (!check.valid) {
          setPaymentError(check.message);
          setShowErrorModal(true);
          return;
        }
      }
    }

    if (paymentMethod === 'wallet') {
      if (walletBalance === null || walletBalance < total) {
        setPaymentError(
          'Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền hoặc chọn phương thức khác.'
        );
        setShowErrorModal(true);
        return;
      }
    }

    if (paymentMethod === 'skypoint') {
      const pointsNeeded = skypointInfo ? skypointPointsForAmount(total, skypointInfo.rate) : null;
      if (!useCashPlusPoints && (pointsNeeded === null || skypointInfo!.points < pointsNeeded)) {
        setPaymentError(
          `Số dư SkyPoint không đủ (cần ${pointsNeeded?.toLocaleString('vi-VN') ?? '—'} điểm). Bạn có thể bật tính năng "Thanh toán kết hợp Cash + Points" hoặc chọn phương thức khác.`
        );
        setShowErrorModal(true);
        return;
      }
    }

    if (paymentMethod === 'movi') {
      if (!moviFullName.trim()) {
        setPaymentError('Vui lòng nhập Họ và tên người đăng ký trả sau Movi');
        setShowErrorModal(true);
        return;
      }
      if (!moviBirthDate.trim()) {
        setPaymentError('Vui lòng nhập Ngày sinh (DD/MM/YYYY)');
        setShowErrorModal(true);
        return;
      }
      if (!moviCccd.trim() || moviCccd.trim().length < 9) {
        setPaymentError('Vui lòng nhập số CMND/CCCD hợp lệ (từ 9 đến 12 số)');
        setShowErrorModal(true);
        return;
      }
      if (!moviPhone.trim() || moviPhone.trim().replace(/\D/g, '').length < 10) {
        setPaymentError('Vui lòng nhập số điện thoại hợp lệ (10 số)');
        setShowErrorModal(true);
        return;
      }
    }
    setLoading(true);
    setPaymentError(null);
    setShowErrorModal(false);
    try {
      if (!booking?.bookingId) {
        throw new Error('Không tìm thấy thông tin đặt chỗ');
      }

      await createPayment({
        booking_id: booking.bookingId,
        method: paymentMethod,
        amount: cashDue,
        discount_code_id: promoData?.id ?? undefined,
        discount_amount: discountAmount,
        discount_code: promoData?.code,
        bank_account_id: selectedAdminAccount?.id,
        transfer_note:
          paymentMethod === 'movi'
            ? `MOVI: ${moviFullName.trim()} - CCCD ${moviCccd.trim()} - SĐT ${moviPhone.trim()}`
            : transferNoteInput.trim() || transferNote,
        transfer_amount: transferAmountInput.trim() || String(cashDue),
        receipt_image: receiptImage || undefined,
        points_to_redeem:
          useCashPlusPoints && cashPlusPointsRedeem > 0 ? cashPlusPointsRedeem : undefined,
      });

      setLoading(false);
      setConfirmed(true);
      toast.success('Thanh toán thành công!', 'Vé điện tử đã được gửi đến email của bạn.', {
        duration: 6000,
      });
    } catch (err) {
      setLoading(false);
      const errMsg =
        (err instanceof Error && err.message) ||
        'Thanh toán thất bại. Vui lòng kiểm tra thông tin và thử lại.';
      setPaymentError(errMsg);
      setShowErrorModal(true);
    }
  };

  const formatCardNumber = (val: string) => {
    return val
      .replace(/\D/g, '')
      .substring(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  };

  const handleCopyBookingCode = useCallback(async () => {
    // Nothing to copy until the real PNR arrives; copying "—" would put a
    // useless string on the clipboard.
    if (!bookingCode) return;
    try {
      await navigator.clipboard.writeText(bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = bookingCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [bookingCode]);

  const shareText = useMemo(() => {
    if (!booking) return 'Tôi vừa đặt vé thành công trên Vietjet Air!';
    return `Tôi vừa đặt vé thành công trên Vietjet Air!\n✈️ ${booking.flightNo}: ${booking.fromCity} → ${booking.toCity}\n📅 ${booking.date} | ${booking.departTime} - ${booking.arriveTime}\n🎫 Mã đặt chỗ: ${bookingCodeLabel}`;
  }, [booking, bookingCodeLabel]);

  const handleShareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Đặt vé Vietjet Air thành công!', text: shareText });
      } catch {
        /* ignore */
      }
    }
  }, [shareText]);

  const handlePaymentSuccessFromWebhook = useCallback(() => {
    setConfirmed(true);
    toast.success(
      'Thanh toán thành công!',
      'VietQR đã ghi nhận tiền về và tự động kích hoạt vé điện tử.',
      {
        duration: 6000,
      }
    );
  }, [toast]);

  const handleShareFacebook = useCallback(() => {
    const url = encodeURIComponent(window.location.origin);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=600,height=400'
    );
  }, [shareText]);

  const handleShareTwitter = useCallback(() => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=600,height=400'
    );
  }, [shareText]);

  // Dữ liệu vé điện tử cho success screen (thẻ lên máy bay + bản in PDF).
  const ticketData = useMemo<ETicketData | null>(() => {
    if (!booking) return null;
    return {
      pnr: bookingCodeLabel,
      flightNo: booking.flightNo,
      from: booking.from,
      to: booking.to,
      fromCity: booking.fromCity,
      toCity: booking.toCity,
      date: booking.date,
      departTime: booking.departTime,
      arriveTime: booking.arriveTime,
      passengers: booking.passengers,
      amount: booking.total,
    };
  }, [booking, bookingCodeLabel]);

  /**
   * Mở cửa sổ in với HTML e-ticket (QR + mã vạch, khổ A4) — khách chọn
   * "Lưu thành PDF" trong hộp thoại in của trình duyệt. Cùng pattern với
   * hóa đơn admin (`features/admin/invoice.ts`), không cần thư viện PDF.
   */
  const handleDownloadETicket = useCallback(async () => {
    if (!booking || booking.passengers.length === 0) return;
    const base: ETicketData = {
      pnr: bookingCodeLabel,
      flightNo: booking.flightNo,
      from: booking.from,
      to: booking.to,
      fromCity: booking.fromCity,
      toCity: booking.toCity,
      date: booking.date,
      departTime: booking.departTime,
      arriveTime: booking.arriveTime,
      passengers: booking.passengers,
      amount: booking.total,
    };
    let qrDataUrl: string | undefined;
    try {
      const QRCode = await import('qrcode');
      qrDataUrl = await QRCode.toDataURL(buildBoardingQrContent(base, booking.passengers[0]), {
        margin: 2,
        width: 320,
      });
    } catch {
      // QR vắng mặt vẫn in được — bản in còn mã vạch Code 39 và thông tin vé.
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(
        'Không mở được cửa sổ in',
        'Trình duyệt đã chặn popup — hãy cho phép popup và thử lại.'
      );
      return;
    }
    printWindow.document.write(buildETicketHtml({ ...base, qrDataUrl }));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  }, [booking, bookingCodeLabel, toast]);

  // Xử lý tệp ảnh biên lai chuyển khoản
  const processReceiptFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Định dạng không hợp lệ', 'Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WEBP)');
        return;
      }
      if (file.size > 3.5 * 1024 * 1024) {
        toast.error(
          'File quá lớn',
          'Kích thước ảnh tối đa là 3.5MB để đảm bảo tải lên nhanh chóng'
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImage(reader.result as string);
        setReceiptFileName(file.name);
        setReceiptFileSize((file.size / 1024).toFixed(0) + ' KB');
        toast.success(
          'Đã tải ảnh biên lai thành công!',
          'Ảnh chụp biên lai sẽ được gửi tới Admin để đối chiếu xuất vé.'
        );
      };
      reader.onerror = () => {
        toast.error('Lỗi đọc ảnh', 'Không thể đọc file ảnh, vui lòng thử lại.');
      };
      reader.readAsDataURL(file);
    },
    [toast]
  );

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processReceiptFile(file);
  };

  const handleReceiptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingReceipt(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processReceiptFile(file);
  };

  // Form xác nhận đã chuyển khoản — dùng chung cho tab Ngân hàng và tab VietQR
  const transferConfirmBlock = (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h4 className="text-sm font-bold font-koho text-[var(--foreground)] flex items-center gap-2">
          <Icon name="CheckCircleIcon" size={18} className="text-primary" />
          Xác nhận thanh toán & Tải ảnh biên lai
        </h4>
      </div>

      <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
        Sau khi chuyển khoản hoặc quét mã thành công từ ứng dụng ngân hàng, quý khách vui lòng đính
        kèm ảnh chụp màn hình biên lai hoặc xác nhận bên dưới để hệ thống đối chiếu xuất vé tức thì.
      </p>

      {/* Vị trí tải ảnh lên để admin đối chiếu */}
      <div className="space-y-2">
        <label className="block text-xs font-bold font-koho text-gray-800">
          Ảnh chụp biên lai thanh toán (Khuyên dùng để duyệt vé tức thì)
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleReceiptFileChange}
          className="hidden"
          id="receipt-file-input"
        />

        {!receiptImage ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingReceipt(true);
            }}
            onDragLeave={() => setIsDraggingReceipt(false)}
            onDrop={handleReceiptDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3 sm:p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
              isDraggingReceipt
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-gray-300 hover:border-primary hover:bg-red-50/20 bg-gray-50/60'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Icon name="ArrowUpTrayIcon" size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold font-koho text-gray-900">
                Kéo thả ảnh hoặc <span className="text-primary underline">bấm để chọn ảnh</span>{' '}
                biên lai
              </p>
              <p className="text-3xs text-gray-500 mt-0.5 font-medium">
                Hỗ trợ định dạng PNG, JPG, JPEG, WEBP (Tối đa 8MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-lime-50/60 border border-lime-300 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lime-800 text-xs font-bold font-koho">
                <Icon name="CheckCircleIcon" size={16} className="text-[#38B000]" />
                <span>Đã đính kèm ảnh biên lai thành công</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptImage(null)}
                className="text-3xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1 font-koho"
              >
                <Icon name="TrashIcon" size={12} />
                <span>Xóa ảnh</span>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-lime-200 shadow-2xs">
              <img
                src={receiptImage}
                alt="Ảnh biên lai"
                className="w-16 h-16 object-cover rounded-md border border-gray-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {receiptFileName || 'bien-lai-chuyen-khoan.png'}
                </p>
                <p className="text-3xs text-gray-500 mt-0.5">{receiptFileSize || 'Ảnh hợp lệ'}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-3xs font-semibold text-primary hover:underline mt-1 cursor-pointer block font-koho"
                >
                  Thay đổi ảnh khác
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-semibold font-koho text-[var(--foreground-muted)] mb-1">
            Nội dung chuyển khoản
          </label>
          <input
            type="text"
            value={transferNoteInput}
            onChange={(e) => setTransferNoteInput(e.target.value)}
            placeholder={transferNote}
            className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold font-koho text-[var(--foreground-muted)] mb-1">
            Số tiền đã chuyển (VND)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={transferAmountInput}
            onChange={(e) => setTransferAmountInput(e.target.value)}
            placeholder={String(total)}
            className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div> */}

      {/* Nút ĐÃ THANH TOÁN — Màu xanh nõn chuối Vietjet */}
      <button
        id="btn-da-thanh-toan"
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-[#44BD04] via-[#38B000] to-[#2B9300] hover:from-[#3BB000] hover:to-[#248000] text-white font-koho font-extrabold py-3.5 px-6 rounded-xl shadow-md shadow-[#38B000]/30 hover:shadow-[#38B000]/40 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-sm cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Đang gửi xác nhận thanh toán...</span>
          </>
        ) : (
          <>
            <Icon name="CheckCircleIcon" size={18} className="text-white" />
            <span>
              {receiptImage
                ? selectedMethodGroup === 'vnpay_qr'
                  ? 'Tôi đã thanh toán VNPAY-QR (Đã đính kèm ảnh biên lai)'
                  : selectedMethodGroup === 'vietqr'
                    ? 'Tôi đã thanh toán VietQR (Đã đính kèm ảnh biên lai)'
                    : 'Xác nhận đã thanh toán (Đã đính kèm ảnh biên lai)'
                : selectedMethodGroup === 'vnpay_qr'
                  ? 'Tôi đã quét mã VNPAY-QR — Đã thanh toán'
                  : selectedMethodGroup === 'vietqr'
                    ? 'Tôi đã quét mã VietQR — Đã thanh toán'
                    : 'Tôi đã chuyển khoản — Đã thanh toán'}
            </span>
          </>
        )}
      </button>
    </div>
  );

  if (pageLoading) {
    return <PaymentSkeleton />;
  }

  if (confirmed) {
    return (
      <>
        <ConfettiCanvas />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />

        <div className="pb-12 min-h-screen flex items-center justify-center">
          <div className="max-w-lg w-full mx-auto px-4">
            {/* Success state */}
            <div
              className="bg-white rounded-3xl border border-[var(--border)] overflow-hidden"
              style={{
                boxShadow: '0 32px 72px rgba(0,0,0,0.18), 0 12px 28px rgba(0,0,0,0.10)',
                animation: 'fadeInUp 0.5s ease-out',
              }}
            >
              {/* Header */}
              <div className="bg-gradient-red p-8 text-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  }}
                />
                <div className="relative z-10">
                  <AnimatedCheckmark />
                  <h2 className="text-2xl font-black font-koho text-white mb-1">
                    {receiptImage ? 'Đã ghi nhận thanh toán & ảnh biên lai!' : 'Đặt vé thành công!'}
                  </h2>
                  <p className="text-white/90 text-sm font-medium">
                    {receiptImage
                      ? 'Ảnh biên lai đã được gửi đến Admin đối chiếu. Vé điện tử sẽ được kích hoạt ngay khi kiểm tra.'
                      : 'Vé điện tử đã được gửi đến email của bạn'}
                  </p>
                </div>
              </div>

              {/* E-Ticket */}
              <div className="p-6">
                {/* Booking code with copy button */}
                <div className="text-center mb-6">
                  <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-2">
                    Mã đặt chỗ
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-3xl font-black text-primary tracking-widest">
                      {bookingCodeLabel}
                    </div>
                    <button
                      onClick={handleCopyBookingCode}
                      title="Sao chép mã đặt chỗ"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        copied
                          ? 'bg-[rgb(var(--vj-green-rgb))]/15 text-[var(--vj-green)] border border-[rgb(var(--vj-green-rgb))]/40'
                          : 'bg-[var(--surface-2)] text-[var(--foreground-muted)] border border-[var(--border)] hover:bg-primary-50 hover:text-primary hover:border-primary'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Icon name="CheckIcon" size={13} />
                          Đã sao chép
                        </>
                      ) : (
                        <>
                          <Icon name="ClipboardDocumentIcon" size={13} />
                          Sao chép
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Dashed divider */}
                <div className="relative my-5">
                  <div className="border-t-2 border-dashed border-[var(--border)] " />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--surface)] rounded-full -ml-2 border border-[var(--border)] " />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--surface)] rounded-full -mr-2 border border-[var(--border)] " />
                </div>

                {/* Flight info */}
                <div className="bg-[var(--surface)] rounded-2xl p-4 mb-4">
                  {booking && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold text-[var(--foreground-subtle)]">
                          {booking.flightNo}
                        </div>
                        <div className="text-xs text-[var(--foreground-subtle)]">
                          {formatBookingDay(booking.date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-2xl font-black text-[var(--foreground)]">
                            {booking.departTime}
                          </div>
                          <div className="text-xs font-semibold text-[var(--foreground-muted)]">
                            {booking.from}
                          </div>
                          <div className="text-xs text-[var(--foreground-subtle)]">
                            {booking.fromCity}
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <Icon name="PaperAirplaneIcon" size={20} className="text-primary" />
                          <div className="text-xs text-[var(--foreground-subtle)] mt-1">
                            Bay thẳng
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-[var(--foreground)]">
                            {booking.arriveTime}
                          </div>
                          <div className="text-xs font-semibold text-[var(--foreground-muted)]">
                            {booking.to}
                          </div>
                          <div className="text-xs text-[var(--foreground-subtle)]">
                            {booking.toCity}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Passenger */}
                {booking?.passengers.map((p: { name: string; seat: string }, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-[var(--border)] "
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                        <Icon name="UserIcon" size={14} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--foreground)] text-sm">
                          {p.name}
                        </div>
                        <div className="text-xs text-[var(--foreground-subtle)]">
                          Hành khách {i + 1}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--foreground)]">Ghế {p.seat}</div>
                      <div className="text-xs text-[var(--foreground-subtle)]">Phổ thông</div>
                    </div>
                  </div>
                ))}

                {/* Bank Payment Info — the receiving account, since the customer
                    no longer enters an account of their own. */}
                {paymentMethod === 'bank' && selectedAdminAccount && (
                  <div className="mt-4 bg-[rgb(var(--blue-rgb))]/10 border border-[rgb(var(--blue-rgb))]/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-primary">
                        {selectedAdminAccount.admin_bank_name.substring(0, 2)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--blue)] uppercase tracking-wider block">
                          Thanh toán qua ngân hàng
                        </span>
                        <span className="text-xs text-[var(--blue)]">
                          {selectedAdminAccount.admin_bank_name}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm bg-[var(--background)] rounded-lg p-3 border border-[rgb(var(--blue-rgb))]/20">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--foreground-muted)] text-xs">Số tài khoản</span>
                        <span className="font-mono font-bold text-[var(--foreground)]">
                          {selectedAdminAccount.admin_bank_account_number}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-[var(--border)] " />
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--foreground-muted)] text-xs">
                          Chủ tài khoản
                        </span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {selectedAdminAccount.admin_bank_account_holder}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-[var(--border)] " />
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--foreground-muted)] text-xs">
                          Nội dung chuyển khoản
                        </span>
                        <span className="font-mono font-bold text-primary">{transferNote}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--border)] ">
                  <span className="font-bold text-[var(--foreground-muted)]">Tổng thanh toán</span>
                  <span className="text-xl font-black text-primary">
                    {total.toLocaleString('vi-VN')}₫
                  </span>
                </div>

                {/* E-boarding passes — mỗi hành khách một thẻ, QR + mã vạch thật. */}
                <div className="mt-5 space-y-4">
                  <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest text-center">
                    Thẻ lên máy bay điện tử
                  </div>
                  {ticketData?.passengers.map((p, i) => (
                    <EBoardingPass key={i} data={ticketData} passenger={p} />
                  ))}
                </div>

                {/* Share section */}
                <div className="mt-5 pt-4 border-t border-[var(--border)] ">
                  <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest mb-3 text-center">
                    Chia sẻ chuyến bay
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {/* Facebook */}
                    <button
                      onClick={handleShareFacebook}
                      title="Chia sẻ lên Facebook"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-social-facebook text-white text-xs font-semibold hover:bg-social-facebook-hover transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>
                    {/* Twitter/X */}
                    <button
                      onClick={handleShareTwitter}
                      title="Chia sẻ lên X (Twitter)"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--foreground)] text-white text-xs font-semibold hover:bg-[var(--foreground-muted)] transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      X
                    </button>
                    {/* Native share (mobile) */}
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={handleShareNative}
                        title="Chia sẻ"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--foreground-muted)] text-xs font-semibold hover:bg-[var(--surface-3)] transition-all hover:-translate-y-0.5 hover:shadow-md border border-[var(--border)] "
                      >
                        <Icon name="ShareIcon" size={14} />
                        Chia sẻ
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadETicket}
                    className="w-full flex items-center justify-center gap-2 bg-vjyellow hover:bg-accent-dark text-[var(--foreground)] font-black py-3.5 rounded-xl transition-all shadow-vj-btn hover:shadow-vj-btn-hover hover:-translate-y-0.5 text-sm"
                  >
                    <Icon name="ArrowDownTrayIcon" size={16} />
                    Tải vé điện tử (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowItineraryModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#ED1B24] hover:bg-[#c81018] text-white font-bold py-3.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
                  >
                    <Icon name="TicketIcon" size={16} />
                    Xem Hành trình & Vé điện tử (Vietjet Itinerary)
                  </button>
                  <Link
                    href={`/dat-ve/${bookingCode || bookingId || booking?.bookingId || ''}`}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition-all text-sm"
                  >
                    <Icon name="DocumentTextIcon" size={16} />
                    Trang chi tiết vé #{bookingCodeLabel}
                  </Link>
                  <Link
                    href="/chuyen-bay-cua-toi"
                    className="vj-btn vj-btn-primary w-full py-3 rounded-xl text-sm"
                  >
                    <Icon name="HomeIcon" size={16} />
                    Chuyến bay của tôi
                  </Link>
                  <Link
                    href="/trang-chu"
                    className="w-full border border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface)] font-semibold py-2.5 rounded-xl transition-all text-sm text-center"
                  >
                    Về trang chủ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ItineraryModal
          isOpen={showItineraryModal}
          onClose={() => setShowItineraryModal(false)}
          booking={itineraryBookingData}
        />
      </>
    );
  }

  return (
    <>
      {/* Trip strip — brand-yellow band directly under header */}
      <div
        className="bg-gradient-to-r from-[#FFCC00] via-[#FFD200] to-[#FFE066] text-gray-950 shadow-sm border-b border-amber-300"
        data-testid="trip-board"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-x-3 px-3 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm">
          {/* Mobile "Tổng [X] VND ▾" button + compact route */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="bg-white rounded-full px-2.5 py-1 text-2xs font-bold text-gray-900 flex items-center gap-1 shadow-xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all border border-amber-200 shrink-0"
            >
              <span>Tổng:</span>
              <span className="text-red-600 font-bold">
                {total > 0 ? `${total.toLocaleString('vi-VN')} VND` : '0 VND'}
              </span>
              <span className="text-3xs text-gray-500">▾</span>
            </button>
            <div className="flex items-center gap-1 font-koho text-2xs font-semibold text-gray-900 truncate">
              <span>{booking?.fromCity || booking?.from || 'TP. HCM'}</span>
              <span className="text-red-600">✈</span>
              <span>{booking?.toCity || booking?.to || 'Đà Nẵng'}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-koho">
            <span className="font-bold text-xs uppercase tracking-normal text-gray-950 font-koho">
              {booking?.fromCity || 'TP. HCM'} ({booking?.from || 'SGN'})
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-red-600 rotate-45 inline shrink-0"
              aria-hidden="true"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span className="font-bold text-xs uppercase tracking-normal text-gray-950 font-koho">
              {booking?.toCity || 'Đà Nẵng'} ({booking?.to || 'DAD'})
            </span>
            <span className="text-3xs font-semibold text-gray-700 bg-white/70 px-2 py-0.5 rounded-full ml-1 border border-amber-300/60 font-koho">
              {booking?.flightNo ? `Chuyến bay ${booking.flightNo}` : 'VJ141'}
            </span>
          </div>

          {/* 4 Steps Indicator (with Step 4 active) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 font-koho">
            <div
              className="flex items-center gap-1 text-gray-700 font-bold text-xs"
              title="1. Chọn chuyến bay"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#38B000] text-white shadow-xs">
                <Icon name="CheckIcon" size={12} />
              </div>
              <span className="hidden md:inline text-3xs font-black text-gray-800 font-koho">
                Chuyến bay
              </span>
            </div>
            <span className="text-gray-400 text-3xs">›</span>
            <div
              className="flex items-center gap-1 text-gray-700 font-bold text-xs"
              title="2. Thông tin hành khách"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#38B000] text-white shadow-xs">
                <Icon name="CheckIcon" size={12} />
              </div>
              <span className="hidden md:inline text-3xs font-black text-gray-800 font-koho">
                Hành khách
              </span>
            </div>
            <span className="text-gray-400 text-3xs">›</span>
            <div
              className="flex items-center gap-1 text-gray-700 font-bold text-xs"
              title="3. Dịch vụ bổ sung"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#38B000] text-white shadow-xs">
                <Icon name="CheckIcon" size={12} />
              </div>
              <span className="hidden md:inline text-3xs font-black text-gray-800 font-koho">
                Dịch vụ
              </span>
            </div>
            <span className="text-gray-400 text-3xs">›</span>
            <div
              className="flex items-center gap-1 text-gray-950 font-black text-xs"
              title="4. Thanh toán"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--vj-red)] text-white shadow-sm ring-2 ring-red-400/40 animate-pulse font-black text-xs leading-none font-koho">
                4
              </div>
              <span className="hidden md:inline text-3xs font-black text-[var(--vj-red)] uppercase tracking-wider font-koho">
                Thanh toán
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 sm:pt-6 pb-28 sm:pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Reservation Countdown Timer */}
          <ReservationCountdown
            initialMinutes={15}
            bookingCode={bookingCodeLabel !== '—' ? bookingCodeLabel : undefined}
          />

          <h1 className="hidden sm:block text-2xl font-black font-koho text-[var(--foreground)] mb-4">
            Thanh toán vé máy bay
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Checkbox: Mã khuyến mãi hoặc phiếu quà tặng matching Screenshot 3 */}
              <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasPromoChecked}
                    onChange={(e) => setHasPromoChecked(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer accent-red-600"
                  />
                  <span className="text-sm font-extrabold text-gray-900">
                    Mã khuyến mãi hoặc phiếu quà tặng
                  </span>
                </label>
                {hasPromoChecked && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Nhập mã khuyến mãi"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs uppercase font-bold outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={isApplyingPromo || !promoCode.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      {isApplyingPromo ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                )}
                {promoApplied && promoData && (
                  <div className="mt-2 text-xs font-bold text-green-700 flex items-center gap-1">
                    <span>✓</span> Đã áp dụng mã {promoData.code}: -
                    {promoData.discountAmount.toLocaleString('vi-VN')} VND
                  </div>
                )}
                {promoError && (
                  <div className="mt-2 text-xs font-semibold text-red-600">{promoError}</div>
                )}
              </div>

              {/* Payment Method Card */}
              <div className="bg-white rounded-2xl border border-[var(--border)] p-4 sm:p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-extrabold font-koho text-base text-gray-900">
                      Phương thức thanh toán
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Chọn một phương thức phù hợp để hoàn tất đặt chỗ
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="hidden sm:inline font-koho">Cổng thanh toán:</span>
                    <GalaxyPayBadge />
                  </div>
                </div>

                {/* 1. Thẻ và tài khoản ngân hàng (Screenshot 3) */}
                <div className="mb-5">
                  <h3 className="text-xs sm:text-sm font-extrabold font-koho text-gray-900 mb-2.5">
                    Thẻ và tài khoản ngân hàng
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* 1. Quét mã QR VNPAY (Khuyên dùng - Mặc định) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('vnpay_qr');
                        setPaymentMethod('vietqr');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] relative overflow-hidden ${
                        selectedMethodGroup === 'vnpay_qr'
                          ? 'border-[#005BAA] ring-2 ring-[#005BAA] bg-blue-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="absolute top-0 right-0 bg-[#ED1C24] text-white text-4xs font-black px-1.5 py-0.5 rounded-bl-md uppercase tracking-wider">
                        Khuyên dùng
                      </div>
                      <div className="flex items-center h-8">
                        <VnpayLogo className="h-5 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Quét mã VNPAY-QR
                      </span>
                    </button>

                    {/* 2. Mobile Banking VietQR */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('vietqr');
                        setPaymentMethod('vietqr');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] relative overflow-hidden ${
                        selectedMethodGroup === 'vietqr'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/30 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <VietQrLogo className="h-5 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Mobile Banking VietQR
                      </span>
                    </button>

                    {/* 3. Thẻ ATM nội địa Napas */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('napas');
                        setPaymentMethod('bank');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] ${
                        selectedMethodGroup === 'napas'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <NapasLogo className="h-4 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Thẻ ATM nội địa</span>
                    </button>

                    {/* 4. Thẻ tín dụng / ghi nợ quốc tế */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('card');
                        setPaymentMethod('card');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] ${
                        selectedMethodGroup === 'card'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {/* Bốn logo mạng thẻ xếp 2×2 để không bị chồng lên nhau */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 h-8 items-center">
                        <VisaLogo className="h-4 w-auto" />
                        <MastercardLogo className="h-4 w-auto" />
                        <JcbLogo className="h-4 w-auto" />
                        <AmexLogo className="h-4 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Thẻ tín dụng / ghi nợ quốc tế
                      </span>
                    </button>

                    {/* 5. Thanh toán nội địa VNPAY */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('vnpay_dom');
                        setPaymentMethod('vietqr');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] ${
                        selectedMethodGroup === 'vnpay_dom'
                          ? 'border-[#005BAA] ring-2 ring-[#005BAA] bg-blue-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <VnpayLogo className="h-4 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Thanh toán nội địa VNPAY
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Ví điện tử (Screenshot 3) */}
                <div className="mb-5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 mb-2.5">
                    Ví điện tử
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* SkyJoy (ví tích lũy / điểm SkyPoint) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('skypay');
                        setPaymentMethod('skypoint');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'skypay'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <SkyJoyLogo className="h-7 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Ví SkyJoy</span>
                    </button>

                    {/* MoMo */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('momo');
                        setPaymentMethod('e_wallet');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'momo'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <MomoLogo className="h-7 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Ví MoMo</span>
                    </button>

                    {/* ZaloPay */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('zalopay');
                        setPaymentMethod('e_wallet');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'zalopay'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <ZaloPayLogo className="h-5 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Ví ZaloPay</span>
                    </button>

                    {/* Apple Pay */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('applepay');
                        setPaymentMethod('card');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'applepay'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <ApplePayLogo className="h-6 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Apple Pay</span>
                    </button>

                    {/* Google Pay */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('googlepay');
                        setPaymentMethod('card');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'googlepay'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <GooglePayLogo className="h-5 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Google Pay</span>
                    </button>
                  </div>
                </div>

                {/* 3. Giữ mã đặt chỗ & thanh toán sau (Screenshot 4) */}
                <div className="mb-5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 mb-2.5">
                    Giữ mã đặt chỗ & thanh toán sau
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('movi');
                        setPaymentMethod('movi');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'movi'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center h-8">
                        <MoviLogo className="h-6 w-auto max-w-[104px]" />
                      </div>
                      <span className="text-4xs text-gray-500 font-medium block mt-0.5">
                        Bay trước, trả sau
                      </span>
                      <span className="text-xs font-bold text-gray-900 mt-1">Trả góp Movi</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handlePayment}>
                  {/* Card Form */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      {/* Interactive Virtual Credit Card */}
                      <VirtualCreditCard
                        cardNumber={cardNumber}
                        cardName={cardName}
                        expiry={expiry}
                        cvv={cvv}
                        isFlipped={isCardFlipped}
                      />

                      <div>
                        <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5">
                          Số thẻ
                        </label>
                        <div className={`form-field-float ${cardNumber ? 'has-value' : ''}`}>
                          <Icon
                            name="CreditCardIcon"
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)] z-10 pointer-events-none"
                          />
                          <input
                            id="cardNumber"
                            name="cardNumber"
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            placeholder=" "
                            className={`w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-base font-mono form-input sm:text-sm ${cardNumber.replace(/\s/g, '').length === 16 ? 'form-input-valid' : ''}`}
                            maxLength={19}
                            required
                          />
                          <label className="form-label-float has-icon">0000 0000 0000 0000</label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5">
                          Tên chủ thẻ
                        </label>
                        <div className={`form-field-float ${cardName ? 'has-value' : ''}`}>
                          <input
                            id="cardName"
                            name="cardName"
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            placeholder=" "
                            className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-base font-semibold form-input uppercase sm:text-sm ${cardName.trim().length >= 3 ? 'form-input-valid' : ''}`}
                            required
                          />
                          <label className="form-label-float">NGUYEN VAN A</label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5">
                            Ngày hết hạn
                          </label>
                          <div className={`form-field-float ${expiry ? 'has-value' : ''}`}>
                            <input
                              id="cardExpiry"
                              name="cardExpiry"
                              type="text"
                              value={expiry}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').substring(0, 4);
                                setExpiry(v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v);
                              }}
                              placeholder=" "
                              className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-base form-input sm:text-sm ${expiry.length === 5 ? 'form-input-valid' : ''}`}
                              maxLength={5}
                              required
                            />
                            <label className="form-label-float">MM/YY</label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5">
                            CVV
                          </label>
                          <div className={`form-field-float ${cvv ? 'has-value' : ''}`}>
                            <input
                              id="cardCvv"
                              name="cardCvv"
                              type="password"
                              value={cvv}
                              onFocus={() => setIsCardFlipped(true)}
                              onBlur={() => setIsCardFlipped(false)}
                              onChange={(e) =>
                                setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))
                              }
                              placeholder=" "
                              className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-base form-input sm:text-sm ${cvv.length === 3 ? 'form-input-valid' : ''}`}
                              maxLength={3}
                              required
                            />
                            <label className="form-label-float">•••</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Transfer */}
                  {paymentMethod === 'bank' && (
                    <div className="space-y-4">
                      {/* Transfer Instructions Redesign */}
                      {selectedAdminAccount && (
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wider mb-2 font-koho flex items-center gap-1.5">
                            <Icon
                              name="InformationCircleIcon"
                              size={16}
                              className="text-[#005BAA]"
                            />
                            Thông tin thanh toán
                          </label>

                          {/* Account Tabs if multiple */}
                          {adminAccounts.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                              {adminAccounts.map((acc) => (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => setSelectedAdminAccount(acc)}
                                  className={`px-3 py-1.5 rounded-full text-xs2 font-bold whitespace-nowrap transition-all ${
                                    selectedAdminAccount.id === acc.id
                                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                                      : 'bg-[var(--surface-2)] text-[var(--foreground-muted)] hover:bg-[var(--surface-3)] '
                                  }`}
                                >
                                  {acc.admin_bank_name}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="bg-white border-2 border-primary/20 rounded-3xl overflow-hidden shadow-xl">
                            <div className="p-4 bg-gradient-to-br from-[var(--surface)] to-[var(--background)]">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest bg-[var(--surface-2)] px-2 py-0.5 rounded inline-block mb-1">
                                    Ngân hàng thụ hưởng
                                  </div>
                                  <h4 className="text-lg font-black text-[var(--foreground)]">
                                    {selectedAdminAccount.admin_bank_name}
                                  </h4>
                                </div>
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-[var(--border)] flex items-center justify-center p-1">
                                  <div className="text-2xs font-black text-primary">
                                    {selectedAdminAccount.admin_bank_name.substring(0, 3)}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                  <div>
                                    <label className="text-2xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest block mb-0.5">
                                      Số tài khoản
                                    </label>
                                    <p className="text-lg font-mono font-black text-[var(--foreground)] leading-none tracking-wider">
                                      {selectedAdminAccount.admin_bank_account_number}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        selectedAdminAccount.admin_bank_account_number
                                      );
                                      toast.success(
                                        'Đã chép',
                                        'Số tài khoản đã được lưu vào bộ nhớ tạm'
                                      );
                                    }}
                                    className="text-primary hover:bg-primary/5 p-2 rounded-lg transition-colors"
                                  >
                                    <Icon name="ClipboardDocumentIcon" size={18} />
                                  </button>
                                </div>

                                <div className="flex justify-between items-center py-3 px-4 bg-primary/5 rounded-2xl border border-primary/10">
                                  <div>
                                    <label className="text-2xs font-bold text-primary/60 uppercase tracking-widest block mb-0.5">
                                      Nội dung chuyển khoản
                                    </label>
                                    <p className="text-base font-black text-primary leading-none tracking-widest font-sans">
                                      {transferNote}
                                    </p>
                                    <span className="inline-block mt-1 text-xs2 font-semibold text-amber-800 bg-amber-100/90 border border-amber-300 rounded px-1.5 py-0.5">
                                      (Lưu ý: ký tự &quot;O&quot; là chữ O in hoa, không phải số 0)
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(transferNote);
                                      toast.success(
                                        'Đã chép',
                                        'Nội dung chuyển khoản đã được lưu vào bộ nhớ tạm'
                                      );
                                    }}
                                    className="bg-primary text-white hover:bg-primary-dark w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md shadow-primary/20"
                                  >
                                    <Icon name="ClipboardDocumentIcon" size={18} />
                                  </button>
                                </div>

                                <div className="pt-2">
                                  <label className="text-2xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest block mb-1">
                                    Chủ tài khoản
                                  </label>
                                  <p className="text-sm font-bold text-[var(--foreground)]">
                                    {selectedAdminAccount.admin_bank_account_holder.toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* VietQR / VNPAY-QR Quick Scan */}
                            <div className="flex flex-col items-center justify-center p-4 bg-white border-t border-[var(--border)]">
                              <span className="text-xs font-bold text-[#005BAA] uppercase tracking-wider mb-2 font-koho flex items-center gap-1.5">
                                <Icon name="QrCodeIcon" size={16} />
                                Quét mã QR thanh toán (STK Admin)
                              </span>
                              <VietQrBox
                                bookingId={booking?.bookingId ?? bookingId}
                                onPaid={handlePaymentSuccessFromWebhook}
                                fallbackAccount={selectedAdminAccount}
                                fallbackAmount={total}
                                fallbackPnr={
                                  bookingCodeLabel !== '—'
                                    ? bookingCodeLabel
                                    : (booking?.flightNo ?? 'VJ141')
                                }
                                fallbackAddInfo={transferNote}
                                showBankHeader={false}
                                methodType={selectedMethodGroup}
                              />
                            </div>

                            <div className="bg-[var(--foreground)] p-3 flex items-center justify-center gap-2">
                              <Icon
                                name="ShieldCheckIcon"
                                size={14}
                                className="text-[var(--vj-green)]"
                              />
                              <span className="text-2xs font-bold text-white/70 uppercase tracking-widest">
                                Giao dịch bảo mật
                              </span>
                            </div>
                          </div>

                          {transferConfirmBlock}
                        </div>
                      )}
                    </div>
                  )}

                  {/* VNPAY-QR / VietQR — mã EMVCo sinh ở server, QR render cục bộ theo STK admin,
                      polling tự dò giao dịch; form xác nhận thủ công là fallback. */}
                  {paymentMethod === 'vietqr' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <label className="text-xs font-bold text-gray-800 uppercase tracking-wider font-koho flex items-center gap-1.5">
                          <Icon name="QrCodeIcon" size={16} className="text-[#005BAA]" />
                          {selectedMethodGroup === 'vnpay_qr'
                            ? 'Thông tin thanh toán (Mã QR VNPAY-QR)'
                            : 'Thông tin thanh toán (Mã QR thanh toán VietQR)'}
                        </label>
                        <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#005BAA] border border-blue-200">
                          {selectedMethodGroup === 'vnpay_qr'
                            ? 'Quét mã VNPAY-QR'
                            : 'Quét mã trực tiếp'}
                        </span>
                      </div>
                      <VietQrBox
                        bookingId={booking?.bookingId ?? bookingId}
                        onPaid={handlePaymentSuccessFromWebhook}
                        fallbackAccount={selectedAdminAccount}
                        fallbackAmount={total}
                        fallbackPnr={
                          bookingCodeLabel !== '—'
                            ? bookingCodeLabel
                            : (booking?.flightNo ?? 'VJ141')
                        }
                        fallbackAddInfo={transferNote}
                        methodType={selectedMethodGroup}
                      />
                      {transferConfirmBlock}
                    </div>
                  )}

                  {/* Wallet Payment */}
                  {paymentMethod === 'wallet' && (
                    <div className="space-y-4">
                      <div
                        className={`bg-[var(--background)] border rounded-2xl p-6 flex flex-col items-center gap-4 transition-all ${walletBalance !== null && walletBalance >= total ? 'border-[rgb(var(--vj-green-rgb))]/40 bg-[rgb(var(--vj-green-rgb))]/10' : 'border-[var(--border)] '}`}
                      >
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                          <Icon name="WalletIcon" size={32} className="text-primary" />
                        </div>
                        <div className="text-center">
                          <h4 className="font-bold text-[var(--foreground)] mb-1">
                            Thanh toán bằng ví tài khoản
                          </h4>
                          <p className="text-sm text-[var(--foreground-muted)]">
                            Thanh toán nhanh chóng bằng số dư của bạn
                          </p>
                        </div>

                        <div className="w-full border-t border-[var(--border)] pt-4 mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-[var(--foreground-muted)]">
                              Số dư hiện tại:
                            </span>
                            <span
                              className={`text-base font-black ${walletBalance === null ? 'animate-pulse text-[var(--foreground-subtle)]' : walletBalance >= total ? 'text-[var(--vj-green)]' : 'text-primary'}`}
                            >
                              {walletBalance !== null
                                ? walletBalance.toLocaleString('vi-VN') + '₫'
                                : '••••••₫'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-[var(--foreground-muted)]">
                              Số tiền cần trả:
                            </span>
                            <span className="text-base font-black text-[var(--foreground)]">
                              {total.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        </div>

                        {walletBalance !== null && walletBalance < total && (
                          <Link
                            href="/tai-khoan"
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-2"
                          >
                            <Icon name="PlusCircleIcon" size={14} />
                            Nạp thêm tiền vào ví ngay
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* E-Wallet */}
                  {paymentMethod === 'e_wallet' && (
                    <div className="grid grid-cols-3 gap-3">
                      {EWALLETS.map((wallet) => (
                        <button
                          key={wallet}
                          type="button"
                          className="py-4 px-4 bg-[var(--surface)] hover:bg-primary-50 hover:border-primary border border-[var(--border)] rounded-xl text-sm font-bold text-[var(--foreground-muted)] transition-all flex flex-col items-center gap-2"
                        >
                          <Icon name="DevicePhoneMobileIcon" size={24} className="text-primary" />
                          {wallet}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* SkyPoint / Ví SkyJoy — thanh toán bằng điểm tích lũy & Cash + Points */}
                  {paymentMethod === 'skypoint' && (
                    <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 flex flex-col gap-5 transition-all shadow-xs">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-md text-white flex-shrink-0">
                          <Icon name="StarIcon" size={28} variant="solid" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--foreground)] text-base">
                            Ví Điểm Thưởng SkyJoy Rewards
                          </h4>
                          <p className="text-xs text-[var(--foreground-muted)]">
                            Tích hợp cơ chế thanh toán kết hợp Điểm thưởng + Tiền mặt (Cash +
                            Points)
                          </p>
                        </div>
                      </div>

                      <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--foreground-muted)]">Số dư SkyPoint:</span>
                          <span
                            className={`font-black ${skypointInfo === null ? 'animate-pulse text-[var(--foreground-subtle)]' : 'text-amber-600'}`}
                          >
                            {skypointInfo !== null
                              ? `${skypointInfo.points.toLocaleString('vi-VN')} điểm (≈ ${skypointValueOfPoints(skypointInfo.points, skypointInfo.rate).toLocaleString('vi-VN')}₫)`
                              : '•••••• điểm'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--foreground-muted)]">
                            Cần cho 100% hóa đơn này:
                          </span>
                          <span className="font-black text-[var(--foreground)]">
                            {skypointInfo
                              ? `${skypointPointsForAmount(total, skypointInfo.rate).toLocaleString('vi-VN')} điểm`
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Cash + Points Switch & Slider */}
                      <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-1)] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm text-[var(--foreground)]">
                              Thanh toán kết hợp (Cash + Points)
                            </span>
                            <p className="text-xs text-[var(--foreground-muted)]">
                              Dùng một phần điểm để giảm trừ tiền vé
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = !useCashPlusPoints;
                              setUseCashPlusPoints(nextVal);
                              if (nextVal && skypointInfo) {
                                setCashPlusPointsRedeem(maxPossiblePointsToRedeem);
                              } else {
                                setCashPlusPointsRedeem(0);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              useCashPlusPoints ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                useCashPlusPoints ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {useCashPlusPoints && skypointInfo && (
                          <div className="pt-3 border-t border-[var(--border)] space-y-3">
                            <div className="flex justify-between text-xs font-semibold text-[var(--foreground)]">
                              <span>Số điểm muốn đổi:</span>
                              <span className="text-primary font-bold">
                                {cashPlusPointsRedeem.toLocaleString('vi-VN')} SkyPoint
                              </span>
                            </div>

                            <input
                              type="range"
                              min={0}
                              max={maxPossiblePointsToRedeem}
                              step={100}
                              value={cashPlusPointsRedeem}
                              onChange={(e) => setCashPlusPointsRedeem(Number(e.target.value))}
                              className="w-full accent-primary cursor-pointer"
                            />

                            <div className="grid grid-cols-4 gap-2">
                              {[0.25, 0.5, 0.75, 1.0].map((pct) => {
                                const pts = Math.round(maxPossiblePointsToRedeem * pct);
                                return (
                                  <button
                                    type="button"
                                    key={pct}
                                    onClick={() => setCashPlusPointsRedeem(pts)}
                                    className="py-1 px-2 rounded-lg text-xs font-semibold bg-[var(--surface-2)] border border-[var(--border)] hover:border-primary transition-colors text-[var(--foreground)]"
                                  >
                                    {pct * 100}%
                                  </button>
                                );
                              })}
                            </div>

                            <div className="bg-[var(--surface-2)] rounded-lg p-3 text-xs space-y-1.5 border border-[var(--border)]">
                              <div className="flex justify-between">
                                <span className="text-[var(--foreground-muted)]">
                                  Giảm trừ từ điểm thưởng:
                                </span>
                                <span className="font-bold text-emerald-600">
                                  -{cashPlusPointsDiscountVnd.toLocaleString('vi-VN')}₫
                                </span>
                              </div>
                              <div className="flex justify-between text-sm pt-1 border-t border-[var(--border)]">
                                <span className="font-bold text-[var(--foreground)]">
                                  Tiền mặt cần thanh toán:
                                </span>
                                <span className="font-black text-primary">
                                  {payableTotal.toLocaleString('vi-VN')}₫
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {skypointInfo &&
                        !useCashPlusPoints &&
                        skypointInfo.points < skypointPointsForAmount(total, skypointInfo.rate) && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-amber-600 font-medium">
                              Số dư điểm chưa đủ để thanh toán toàn bộ đơn hàng
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUseCashPlusPoints(true);
                                setCashPlusPointsRedeem(maxPossiblePointsToRedeem);
                              }}
                              className="text-primary font-bold hover:underline"
                            >
                              Dùng Cash + Points
                            </button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Giữ mã đặt chỗ & thanh toán sau - MOVI chuẩn Vietjet Air */}
                  {paymentMethod === 'movi' && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4 animate-[fadeIn_0.3s_ease-out]">
                      {/* Tiêu đề */}
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 font-koho">
                        Giữ mã đặt chỗ &amp; thanh toán sau
                      </h3>

                      {/* Logo Movi chuẩn nhận diện */}
                      <div>
                        <div className="inline-flex flex-col items-center justify-center border border-gray-200 rounded-xl px-4 py-2 bg-white shadow-2xs">
                          <span className="text-2xl font-black text-[#E50051] tracking-tight leading-none lowercase">
                            movi
                          </span>
                          <span className="text-2xs font-bold text-gray-800 leading-tight mt-1 text-center font-koho">
                            Bay trước, trả sau
                          </span>
                        </div>
                      </div>

                      {/* Hướng dẫn nhập thông tin */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-gray-900">
                          Vui lòng nhập thông tin của bạn:
                        </h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Vui lòng nhập các thông tin: Họ tên, Ngày sinh, CMND/CCCD và số điện
                          thoại. Sau đó nhấn Xác nhận để tiếp tục....
                        </p>
                      </div>

                      {/* Các trường nhập liệu (gạch chân đúng theo thiết kế Vietjet) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-1 text-xs">
                        <div>
                          <input
                            type="text"
                            value={moviFullName}
                            onChange={(e) => setMoviFullName(e.target.value.toUpperCase())}
                            placeholder="Họ và tên*"
                            className="w-full py-2 bg-transparent border-b border-gray-300 text-xs font-semibold text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors uppercase"
                            required
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            value={moviBirthDate}
                            onChange={(e) => setMoviBirthDate(e.target.value)}
                            placeholder="Ngày sinh*(DD/MM/YYYY)"
                            className="w-full py-2 bg-transparent border-b border-gray-300 text-xs font-semibold text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            maxLength={12}
                            value={moviCccd}
                            onChange={(e) => setMoviCccd(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="CMND/CCCD*"
                            className="w-full py-2 bg-transparent border-b border-gray-300 text-xs font-mono font-semibold text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <input
                            type="tel"
                            value={moviPhone}
                            onChange={(e) => setMoviPhone(e.target.value)}
                            placeholder="Nhập số điện thoại*"
                            className="w-full py-2 bg-transparent border-b border-gray-300 text-xs font-semibold text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                            required
                          />
                        </div>
                      </div>

                      {/* Nút Xác Nhận màu vàng cam góc phải */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handlePayment}
                          disabled={loading}
                          className="cursor-pointer font-bold text-xs sm:text-sm px-6 sm:px-8 py-2 rounded-lg shadow-sm text-gray-950 bg-gradient-to-b from-[#FDB813] to-[#F59E0B] hover:from-[#F59E0B] hover:to-[#D97706] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {loading ? 'Đang xử lý...' : 'Xác Nhận'}
                        </button>
                      </div>

                      {/* Đoạn giải thích chính sách */}
                      <p className="text-xs text-gray-700 leading-relaxed pt-2">
                        “Bay trước, trả sau” là giải pháp tài chính hỗ trợ thanh toán vé máy bay cho
                        khách hàng trên toàn quốc của Vietjet Air, giúp khách hàng dễ dàng tiếp cận
                        dịch vụ vé máy bay giá rẻ và được hỗ trợ hình thức trả góp để khách hàng có
                        thể linh động chi tiêu phù hợp với năng lực tài chính.
                      </p>

                      {/* Chi tiết thanh toán */}
                      <div className="pt-2 space-y-2">
                        <h4 className="text-base font-bold text-gray-900">Chi tiết thanh toán</h4>
                        <div className="rounded-xl border border-red-500 overflow-hidden bg-white text-xs">
                          <div className="p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center text-gray-800">
                              <span className="font-medium">Tạm tính</span>
                              <span className="font-bold text-gray-900">
                                {Math.max(
                                  0,
                                  total - (booking?.ancillaryFee || 54000)
                                ).toLocaleString('vi-VN')}{' '}
                                VND
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-gray-800">
                              <span className="font-medium">Mã khuyến mãi/Phiếu quà tặng</span>
                              <span className="font-bold text-gray-900">
                                {discountAmount > 0
                                  ? `-${discountAmount.toLocaleString('vi-VN')}`
                                  : '0'}{' '}
                                VND
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-gray-800">
                              <span className="font-medium">Phí tiện ích</span>
                              <span className="font-bold text-gray-900">
                                {(booking?.ancillaryFee || 54000).toLocaleString('vi-VN')} VND
                              </span>
                            </div>
                          </div>
                          <div className="bg-[#E31837] text-white px-4 py-3 flex justify-between items-center font-bold">
                            <span className="text-sm">Tổng thanh toán</span>
                            <span className="text-base font-black font-koho">
                              {total.toLocaleString('vi-VN')} VND
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod !== 'movi' && (
                    <>
                      {/* Chi tiết thanh toán matching Screenshot 4 */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-3">
                          Chi tiết thanh toán
                        </h3>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-gray-700">
                            <span>Giá vé cơ bản</span>
                            <span className="font-bold text-gray-900">
                              {(booking?.fareSubtotal ?? total).toLocaleString('vi-VN')} VND
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-gray-700">
                            <span>
                              Thuế &amp; phí sân bay ({Math.round(TAX_AND_FEE_RATE * 100)}%)
                            </span>
                            <span className="font-bold text-gray-900">
                              +{(booking?.tax ?? 0).toLocaleString('vi-VN')} VND
                            </span>
                          </div>
                          {(booking?.seatFee ?? 0) > 0 && (
                            <div className="flex justify-between items-center text-gray-700">
                              <span>Phí chọn chỗ</span>
                              <span className="font-bold text-gray-900">
                                +{(booking?.seatFee ?? 0).toLocaleString('vi-VN')} VND
                              </span>
                            </div>
                          )}
                          {(booking?.ancillaryFee ?? 0) > 0 && (
                            <div className="flex justify-between items-center text-gray-700">
                              <span>Dịch vụ bổ sung</span>
                              <span className="font-bold text-gray-900">
                                +{booking!.ancillaryFee!.toLocaleString('vi-VN')} VND
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-gray-700">
                            <span>Mã khuyến mãi/Phiếu quà tặng</span>
                            <span className="font-bold text-green-600">
                              {discountAmount > 0
                                ? `-${discountAmount.toLocaleString('vi-VN')} VND`
                                : '0 VND'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2.5 border-t border-gray-200">
                            <span>Tổng thanh toán</span>
                            <span className="text-base text-gray-950 font-koho">
                              {total.toLocaleString('vi-VN')} VND
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        id="payment-submit-btn"
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-koho font-black py-3.5 px-5 sm:py-4 sm:px-6 rounded-xl transition-all duration-200 shadow-vj-btn hover:shadow-vj-btn-hover hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 text-sm sm:text-base cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            <span>Đang xử lý thanh toán...</span>
                          </>
                        ) : paymentMethod === 'bank' || paymentMethod === 'vietqr' ? (
                          <>
                            <Icon name="CheckCircleIcon" size={20} />
                            <span>
                              {receiptImage
                                ? `✓ Xác nhận đã thanh toán (${total.toLocaleString('vi-VN')} VND)`
                                : selectedMethodGroup === 'vnpay_qr'
                                  ? `Tôi đã quét mã VNPAY-QR — Xác nhận (${total.toLocaleString('vi-VN')} VND)`
                                  : selectedMethodGroup === 'vietqr'
                                    ? `Tôi đã quét mã VietQR — Xác nhận (${total.toLocaleString('vi-VN')} VND)`
                                    : `Tôi đã chuyển khoản — Xác nhận (${total.toLocaleString('vi-VN')} VND)`}
                            </span>
                          </>
                        ) : (
                          <>
                            <Icon name="LockClosedIcon" size={18} />
                            <span>Thanh toán {total.toLocaleString('vi-VN')}₫</span>
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Inline payment error (shown when modal is dismissed) */}
                  {paymentError && !showErrorModal && (
                    <div className="mt-3 flex items-start gap-3 bg-[rgb(var(--primary-rgb))]/10 border border-primary/30 rounded-xl p-4 text-sm text-primary animate-[fadeInUp_0.3s_ease-out]">
                      <Icon
                        name="ExclamationCircleIcon"
                        size={18}
                        className="text-primary flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <div className="font-semibold mb-0.5">Thanh toán không thành công</div>
                        <div className="text-primary">{paymentError}</div>
                      </div>
                    </div>
                  )}
                </form>

                {/* Security and Accepted Logos Footer */}
                <PaymentSecurityFooter />
              </div>

              {/* Security note */}
              <div className="flex items-center gap-3 bg-[rgb(var(--vj-green-rgb))]/10 border border-[rgb(var(--vj-green-rgb))]/30 rounded-xl p-4 text-sm text-[var(--vj-green)]">
                <Icon
                  name="ShieldCheckIcon"
                  size={20}
                  className="text-[var(--vj-green)] flex-shrink-0"
                />
                <span>
                  Thanh toán được bảo mật bằng mã hóa SSL 256-bit. Thông tin thẻ của bạn an toàn
                  tuyệt đối.
                </span>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1 space-y-4">
              {/* Realistic Vietjet Ticket Card */}
              <BookingTicketCard
                flightNo={booking?.flightNo ?? 'VJ141'}
                from={booking?.from ?? 'SGN'}
                to={booking?.to ?? 'HAN'}
                fromCity={booking?.fromCity ?? 'TP. Hồ Chí Minh'}
                toCity={booking?.toCity ?? 'Hà Nội'}
                departTime={booking?.departTime ?? '08:30'}
                arriveTime={booking?.arriveTime ?? '10:40'}
                date={booking?.date ? formatBookingDay(booking.date) : 'Thứ Sáu, 24/10/2026'}
                bookingCode={bookingCodeLabel !== '—' ? bookingCodeLabel : undefined}
                passengers={booking?.passengers ?? [{ name: 'NGUYỄN VĂN AN', seat: '12A' }]}
                fareClass="Eco"
                ancillaries={
                  booking?.ancillaries?.length
                    ? (booking.ancillaries
                        .map((id) => ANCILLARY_OPTIONS.find((o) => o.id === id)?.title)
                        .filter(Boolean) as string[])
                    : ['Hành lý xách tay 7kg']
                }
                onOpenDetails={() => setShowSummaryModal(true)}
              />

              <div className="bg-white rounded-2xl border border-[var(--border)] p-5 sticky top-[140px] shadow-sm">
                <h3 className="font-extrabold text-sm text-[var(--foreground)] mb-3">
                  Chi tiết giá & thanh toán
                </h3>

                {/* Promo code */}
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5">
                    Mã khuyến mãi
                  </label>
                  <div className="flex gap-2">
                    <div className={`form-field-float flex-1 ${promoCode ? 'has-value' : ''}`}>
                      <input
                        id="promo-code-input"
                        name="promoCode"
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoError('');
                        }}
                        placeholder=" "
                        disabled={promoApplied}
                        className={`w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-base form-input font-mono sm:text-sm disabled:opacity-50 ${promoApplied ? 'form-input-valid' : ''}`}
                      />
                      <label className="form-label-float">VJ2026</label>
                    </div>
                    <button
                      onClick={applyPromo}
                      disabled={promoApplied || !promoCode || isApplyingPromo}
                      className="px-3 py-2 bg-accent text-[var(--foreground)] font-bold rounded-lg text-xs hover:bg-accent-dark transition-colors disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                    >
                      {isApplyingPromo ? (
                        <div className="w-4 h-4 border-2 border-[rgb(var(--foreground-rgb))]/20 border-t-[var(--foreground)] rounded-full animate-spin" />
                      ) : promoApplied ? (
                        '✓'
                      ) : (
                        'Áp dụng'
                      )}
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-primary mt-1">{promoError}</p>}
                  {promoApplied && promoData && (
                    <p className="text-xs text-[var(--vj-green)] mt-1 font-semibold">
                      ✓ Đã áp dụng mã {promoData.code}
                    </p>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Giá vé cơ bản</span>
                    <span className="font-semibold">
                      {booking?.fareSubtotal.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">
                      Thuế &amp; phí sân bay ({Math.round(TAX_AND_FEE_RATE * 100)}%)
                    </span>
                    <span className="font-semibold">
                      +{(booking?.tax ?? 0).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--foreground-muted)]">Phí chọn chỗ</span>
                    <span className="font-semibold">
                      +{(booking?.seatFee ?? 0).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  {(booking?.ancillaryFee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-muted)]">
                        Dịch vụ bổ sung
                        {booking?.ancillaries?.length
                          ? ` (${booking.ancillaries
                              .map((id) => ANCILLARY_OPTIONS.find((o) => o.id === id)?.title)
                              .filter(Boolean)
                              .join(', ')})`
                          : ''}
                      </span>
                      <span className="font-semibold">
                        +{booking!.ancillaryFee!.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  )}
                  {promoApplied && (
                    <div className="flex justify-between text-[var(--vj-green)] font-medium">
                      <span>
                        Giảm giá {promoData?.type === 'percentage' ? `(${promoData.value}%)` : ''}
                      </span>
                      <span className="font-bold">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold text-[var(--foreground)]">
                    <span>Tổng thanh toán</span>
                    <span className="text-primary text-lg">{total.toLocaleString('vi-VN')}₫</span>
                  </div>
                </div>

                <Link
                  href="/tim-ve"
                  className="mt-3 flex min-h-9 items-center gap-1.5 text-xs text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors"
                >
                  <Icon name="ArrowLeftIcon" size={12} />
                  Quay lại chọn chuyến bay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} position="top-right" />
      {/* Payment processing overlay */}
      {loading && <PaymentProcessingOverlay />}

      {/* Error modal */}
      {showErrorModal && paymentError && (
        <ErrorModal
          title="Thanh toán thất bại"
          message={paymentError}
          onRetry={() => {
            setShowErrorModal(false);
            setPaymentError(null);
          }}
          onDismiss={() => {
            setShowErrorModal(false);
            setPaymentError(null);
          }}
        />
      )}

      {/* VietQR Payment Modal matching Screenshot 2 & Screenshot 1 */}
      <PaymentModal
        isOpen={showVietQrModal}
        onClose={() => setShowVietQrModal(false)}
        methodLabel="VietQR"
        subtotal={booking?.fareSubtotal ?? total}
        discount={discountAmount}
        convenienceFee={108000}
        grandTotal={total}
        onProceed={() => {
          setShowVietQrModal(false);
          toast.success(
            'Chuyển sang trang mã QR VietQR',
            'Vui lòng quét mã QR để hoàn tất thanh toán.'
          );
        }}
      />

      {/* Mobile Sticky Bottom Bar matching Screenshots 3 & 4 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] flex items-center gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => router.push('/tim-ve')}
          className="flex-1 bg-[#38B000] hover:bg-[#329e00] text-white font-black italic text-sm py-3 rounded-xl shadow transition-all active:scale-95 cursor-pointer text-center"
        >
          Mua thêm
        </button>
        <button
          type="button"
          onClick={() => {
            // For bank/vietqr tabs, the confirmation button is #btn-da-thanh-toan;
            // for all other methods the submit button is #payment-submit-btn.
            const transferBtn = document.getElementById('btn-da-thanh-toan');
            const submitBtn = document.getElementById('payment-submit-btn');
            if (paymentMethod === 'bank' || paymentMethod === 'vietqr') {
              (transferBtn ?? submitBtn)?.click();
            } else {
              submitBtn?.click();
            }
          }}
          disabled={loading}
          className="flex-1 bg-[#FFCC00] hover:bg-[#FFD200] disabled:opacity-50 text-gray-950 font-black italic text-sm py-3 rounded-xl shadow transition-all active:scale-95 cursor-pointer text-center"
        >
          {loading ? 'Đang xử lý...' : 'Thanh toán'}
        </button>
      </div>

      {/* Modal Thông tin đặt chỗ (Screenshot 7) */}
      <PassengerDetailModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        outboundFare={booking?.total ? Math.round(booking.total * 0.7) : 1220400}
        outboundFlightNo={booking?.flightNo ?? 'VJ141'}
        outboundTrip={
          booking?.from && booking?.to
            ? `${booking.fromCity || booking.from} (${booking.from}) → ${booking.toCity || booking.to} (${booking.to})`
            : undefined
        }
      />
    </>
  );
}
