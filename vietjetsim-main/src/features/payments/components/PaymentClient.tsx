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
  SkyPayLogo,
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
  const [selectedMethodGroup, setSelectedMethodGroup] = useState<string>('card');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
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
  // The PNR is assigned by the database when the booking is created. It used to
  // be invented here — a random string when the URL carried no bookingId, or the
  // raw booking UUID otherwise — and then shown to the customer as "Mã đặt chỗ",
  // copied into bank transfer memos and pasted into chat. None of those values
  // resolved in check-in or tra cứu, so the customer was handed a reference that
  // did not exist. Read the real one instead, and render a dash until it loads.
  const [bookingId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('bookingId');
  });
  const [bookingCode, setBookingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    apiRequest<{ booking?: { booking_code: string | null } }>(`/api/dat-ve/${bookingId}`)
      .then((data) => {
        if (!cancelled) setBookingCode(data.booking?.booking_code ?? null);
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

  // Read booking data from sessionStorage (set by FlightBookingClient)
  const [booking, setBooking] = useState<{
    bookingId?: string;
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

  const discountAmount = promoApplied && promoData ? promoData.discountAmount : 0;
  const total = booking ? booking.total - discountAmount : 0;

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
          bookingAmount: booking?.fareSubtotal || 0,
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
          { transferNote: transferNoteInput, amount: transferAmountInput },
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
      if (pointsNeeded === null || skypointInfo!.points < pointsNeeded) {
        setPaymentError(
          `Số dư SkyPoint không đủ (cần ${pointsNeeded?.toLocaleString('vi-VN') ?? '—'} điểm). Hãy đổi thêm điểm hoặc chọn phương thức khác.`
        );
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
        amount: total,
        discount_code_id: promoData?.id ?? undefined,
        discount_amount: discountAmount,
        discount_code: promoData?.code,
        bank_account_id: selectedAdminAccount?.id,
        transfer_note: transferNoteInput || transferNote,
        transfer_amount: transferAmountInput || String(total),
        receipt_image: receiptImage || undefined,
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
      if (file.size > 8 * 1024 * 1024) {
        toast.error('File quá lớn', 'Kích thước ảnh tối đa là 8MB');
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
          Xác nhận chuyển khoản & Tải ảnh biên lai
        </h4>
        <span className="text-3xs font-extrabold font-koho uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Đối chiếu Admin
        </span>
      </div>

      <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
        Sau khi chuyển khoản thành công từ ứng dụng ngân hàng của bạn, quý khách vui lòng đính kèm ảnh chụp màn hình biên lai hoặc xác nhận bên dưới để Admin đối chiếu xuất vé ngay lập tức.
      </p>

      {/* Vị trí tải ảnh lên để admin đối chiếu */}
      <div className="space-y-2">
        <label className="block text-xs font-bold font-koho text-gray-800">
          Ảnh chụp biên lai chuyển khoản (Khuyên dùng để duyệt vé nhanh)
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
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
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
                Kéo thả ảnh hoặc <span className="text-primary underline">bấm để chọn ảnh</span> biên lai
              </p>
              <p className="text-3xs text-gray-500 mt-0.5 font-medium">
                Hỗ trợ định dạng PNG, JPG, JPEG, WEBP (Tối đa 8MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold font-koho">
                <Icon name="CheckCircleIcon" size={16} className="text-emerald-600" />
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

            <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
      </div>

      {/* Nút ĐÃ THANH TOÁN */}
      <button
        id="btn-da-thanh-toan"
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-koho font-extrabold py-3.5 px-6 rounded-xl shadow-md shadow-emerald-600/25 hover:shadow-emerald-600/35 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-sm cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Đang gửi xác nhận thanh toán...</span>
          </>
        ) : (
          <>
            <Icon name="CheckCircleIcon" size={18} className="text-white" />
            <span>
              {receiptImage
                ? 'Tôi đã chuyển khoản (Đã đính kèm ảnh biên lai)'
                : 'Tôi đã chuyển khoản xong — Đã thanh toán'}
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

        <div className="pt-[128px] pb-12 min-h-screen flex items-center justify-center">
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
                  <h2 className="text-2xl font-black text-white mb-1">Đặt vé thành công!</h2>
                  <p className="text-white/80 text-sm">Vé điện tử đã được gửi đến email của bạn</p>
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
                  <Link
                    href="/tai-khoan"
                    className="vj-btn vj-btn-primary w-full py-3 rounded-xl text-sm"
                  >
                    <Icon name="HomeIcon" size={16} />
                    Xem lịch sử đặt vé
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
          {/* Mobile "Tổng [X] VND ▾" button */}
          <div className="flex sm:hidden items-center">
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="bg-white rounded-full px-3 py-1 text-xs font-black text-gray-900 flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-gray-50 active:scale-95 transition-all border border-amber-200"
            >
              <span>Tổng:</span>
              <span className="text-red-600 font-black">
                {total > 0 ? `${total.toLocaleString('vi-VN')} VND` : '0 VND'}
              </span>
              <span className="text-3xs text-gray-500">▾</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-koho">
            <span className="font-black text-sm uppercase tracking-wide text-gray-950 font-koho">
              {booking?.fromCity || 'TP. HCM'} ({booking?.from || 'SGN'})
            </span>
            <span className="text-red-600 font-bold">✈</span>
            <span className="font-black text-sm uppercase tracking-wide text-gray-950 font-koho">
              {booking?.toCity || 'Hà Nội'} ({booking?.to || 'HAN'})
            </span>
            <span className="text-xs font-bold text-gray-700 bg-white/70 px-2 py-0.5 rounded-full ml-1 border border-amber-300/60 font-koho">
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
              <span className="hidden md:inline text-3xs font-black text-gray-800 font-koho">Chuyến bay</span>
            </div>
            <span className="text-gray-400 text-3xs">›</span>
            <div
              className="flex items-center gap-1 text-gray-700 font-bold text-xs"
              title="2. Thông tin hành khách"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#38B000] text-white shadow-xs">
                <Icon name="CheckIcon" size={12} />
              </div>
              <span className="hidden md:inline text-3xs font-black text-gray-800 font-koho">Hành khách</span>
            </div>
            <span className="text-gray-400 text-3xs">›</span>
            <div
              className="flex items-center gap-1 text-gray-700 font-bold text-xs"
              title="3. Dịch vụ bổ sung"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#38B000] text-white shadow-xs">
                <Icon name="CheckIcon" size={12} />
              </div>
              <span className="hidden md:inline text-3xs font-black text-gray-800 font-koho">Dịch vụ</span>
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
                    <h2 className="font-extrabold font-koho text-base text-gray-900">Phương thức thanh toán</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Chọn một phương thức phù hợp để hoàn tất đặt chỗ</p>
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
                    {/* Credit Card */}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <VisaLogo className="h-3.5 w-auto" />
                        <MastercardLogo className="h-3.5 w-auto" />
                        <JcbLogo className="h-3.5 w-auto" />
                        <AmexLogo className="h-3.5 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Thẻ tín dụng / ghi nợ quốc tế
                      </span>
                    </button>

                    {/* ATM Napas */}
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
                      <div className="py-0.5">
                        <NapasLogo className="h-4 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Thẻ ATM nội địa</span>
                    </button>

                    {/* Mobile Banking VietQR */}
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
                      <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-md uppercase tracking-wider">
                        Khuyên dùng
                      </div>
                      <div className="py-0.5">
                        <VietQrLogo className="h-5 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Mobile Banking VietQR
                      </span>
                    </button>

                    {/* Quét mã QR VNPAY */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('vnpay_qr');
                        setPaymentMethod('vietqr');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] ${
                        selectedMethodGroup === 'vnpay_qr'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="py-0.5">
                        <VnpayLogo className="h-4 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2 line-clamp-2 leading-tight">
                        Quét mã QR VNPAY
                      </span>
                    </button>

                    {/* Thanh toán nội địa VNPAY */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMethodGroup('vnpay_dom');
                        setPaymentMethod('bank');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[96px] ${
                        selectedMethodGroup === 'vnpay_dom'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="py-0.5">
                        <VnpayLogo className="h-4 w-auto" />
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
                    {/* SkyPay */}
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
                      <div className="py-0.5">
                        <SkyPayLogo className="h-4.5 w-auto" />
                      </div>
                      <span className="text-xs font-bold text-gray-900 mt-2">Ví SkyPay</span>
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
                      <div className="flex items-center gap-1.5 py-0.5">
                        <MomoLogo className="h-6 w-auto" />
                        <span className="font-extrabold text-xs text-[#A50064]">MoMo</span>
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
                      <div className="py-0.5">
                        <ZaloPayLogo className="h-4.5 w-auto" />
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
                      <div className="py-0.5">
                        <ApplePayLogo className="h-5 w-auto" />
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
                      <div className="py-0.5">
                        <GooglePayLogo className="h-5 w-auto" />
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
                        setPaymentMethod('bank');
                      }}
                      className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer min-h-[90px] ${
                        selectedMethodGroup === 'movi'
                          ? 'border-green-600 ring-2 ring-green-600 bg-green-50/20 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div>
                        <MoviLogo className="h-5 w-auto" />
                        <span className="text-4xs text-gray-500 font-medium block mt-0.5">
                          Bay trước, trả sau
                        </span>
                      </div>
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
                          <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-2">
                            Thông tin chuyển khoản
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
                                    <p className="text-base font-black text-primary leading-none tracking-widest">
                                      {transferNote}
                                    </p>
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

                            {/* VietQR Quick Scan — payload EMVCo sinh ở server,
                                QR render cục bộ (không gọi img.vietqr.io) +
                                polling tự dò giao dịch. */}
                            <div className="flex flex-col items-center justify-center p-4 bg-white border-t border-[var(--border)]">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                                Quét mã VietQR thanh toán tự động
                              </span>
                              <VietQrBox
                                bookingId={booking?.bookingId ?? bookingId}
                                onPaid={() => setConfirmed(true)}
                                showBankHeader={false}
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

                          {/* The transfer is confirmed here rather than by
                              handing the customer a QR to scan: they re-type the
                              memo and amount we just showed, which is the only
                              proof of payment we can check without a banking
                              integration. */}
                          {transferConfirmBlock}
                        </div>
                      )}
                    </div>
                  )}

                  {/* VietQR — mã EMVCo sinh ở server, QR render cục bộ,
                      polling tự dò giao dịch; form xác nhận thủ công là fallback. */}
                  {paymentMethod === 'vietqr' && (
                    <div className="space-y-4">
                      <VietQrBox
                        bookingId={booking?.bookingId ?? bookingId}
                        onPaid={() => setConfirmed(true)}
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

                  {/* SkyPoint / Ví SkyJoy — thanh toán bằng điểm tích lũy. */}
                  {paymentMethod === 'skypoint' && (
                    <div
                      className={`bg-[var(--background)] border rounded-2xl p-6 flex flex-col items-center gap-4 transition-all ${
                        skypointInfo &&
                        skypointInfo.points >= skypointPointsForAmount(total, skypointInfo.rate)
                          ? 'border-vjbrown/40 bg-vjyellow/10'
                          : 'border-[var(--border)] '
                      }`}
                    >
                      <div className="w-16 h-16 bg-vjyellow rounded-full flex items-center justify-center shadow-md">
                        <Icon
                          name="StarIcon"
                          size={30}
                          className="text-yellow-800"
                          variant="solid"
                        />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-[var(--foreground)] mb-1">
                          Thanh toán bằng SkyPoint
                        </h4>
                        <p className="text-sm text-[var(--foreground-muted)]">
                          Dùng điểm SkyJoy tích lũy để trả cho đặt chỗ này
                        </p>
                      </div>

                      <div className="w-full border-t border-[var(--border)] pt-4 mt-2 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--foreground-muted)]">Số dư SkyPoint:</span>
                          <span
                            className={`font-black ${skypointInfo === null ? 'animate-pulse text-[var(--foreground-subtle)]' : 'text-vjbrown'}`}
                          >
                            {skypointInfo !== null
                              ? `${skypointInfo.points.toLocaleString('vi-VN')} điểm (≈ ${skypointValueOfPoints(skypointInfo.points, skypointInfo.rate).toLocaleString('vi-VN')}₫)`
                              : '•••••• điểm'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--foreground-muted)]">
                            Cần cho giao dịch này:
                          </span>
                          <span className="font-black text-[var(--foreground)]">
                            {skypointInfo
                              ? `${skypointPointsForAmount(total, skypointInfo.rate).toLocaleString('vi-VN')} điểm`
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {skypointInfo &&
                        skypointInfo.points < skypointPointsForAmount(total, skypointInfo.rate) && (
                          <Link
                            href="/tai-khoan"
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1 mt-1"
                          >
                            <Icon name="ArrowTopRightOnSquareIcon" size={14} />
                            Xem cách tích lũy thêm SkyPoint
                          </Link>
                        )}
                    </div>
                  )}

                  {/* Chi tiết thanh toán matching Screenshot 4 */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="font-extrabold text-sm text-gray-900 mb-3">
                      Chi tiết thanh toán
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Tạm tính</span>
                        <span className="font-bold text-gray-900">
                          {(total > 108000 ? total - 108000 : total).toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Mã khuyến mãi/Phiếu quà tặng</span>
                        <span className="font-bold text-green-600">
                          {discountAmount > 0
                            ? `-${discountAmount.toLocaleString('vi-VN')} VND`
                            : '0 VND'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Phí tiện ích</span>
                        <span className="font-bold text-gray-900">108.000 VND</span>
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
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-koho font-black py-4 rounded-xl transition-all duration-200 shadow-vj-btn hover:shadow-vj-btn-hover hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 text-base cursor-pointer"
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
            const submitBtn = document.getElementById('payment-submit-btn');
            if (submitBtn) submitBtn.click();
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
        outboundTrip={booking?.from && booking?.to ? `${booking.from} ✈ ${booking.to}` : undefined}
      />
    </>
  );
}
