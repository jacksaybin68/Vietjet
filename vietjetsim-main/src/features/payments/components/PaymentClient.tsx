'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
import { PaymentSkeleton } from '@/shared/components/ui';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/shared/components/feedback';
import { createPayment, getWalletOverview } from '@/features/payments/services';
import { TAX_AND_FEE_RATE, ANCILLARY_OPTIONS, type AncillaryId } from '@/features/bookings/pricing';

import type { PaymentMethod } from '@/features/payments/types';
import { apiRequest, ApiRequestError } from '@/shared/services';
import { renderTransferNote } from '@/lib/transfer-note';

interface BankAccount {
  id: number;
  admin_bank_name: string;
  admin_bank_account_number: string;
  admin_bank_account_holder: string;
  bank_bin?: string;
  branch?: string;
  logo_url?: string;
  is_default?: boolean;
  transfer_note_template?: string;
}

interface BankInfo {
  id: string;
  name: string;
  fullName: string;
  code: string;
  color: string;
}

const BANKS: BankInfo[] = [
  {
    id: 'vietcombank',
    name: 'Vietcombank',
    fullName: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    code: 'VCB',
    color: '#006A4E',
  },
  {
    id: 'techcombank',
    name: 'Techcombank',
    fullName: 'Ngân hàng TMCP Kỹ Thương Việt Nam',
    code: 'TCB',
    color: '#EE1C25',
  },
  {
    id: 'mbbank',
    name: 'MB Bank',
    fullName: 'Ngân hàng TMCP Quân Đội',
    code: 'MBB',
    color: '#005BA1',
  },
  {
    id: 'bidv',
    name: 'BIDV',
    fullName: 'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam',
    code: 'BIDV',
    color: '#1B3A6B',
  },
  {
    id: 'vpbank',
    name: 'VPBank',
    fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    code: 'VPB',
    color: '#F26522',
  },
  { id: 'acb', name: 'ACB', fullName: 'Ngân hàng TMCP Á Châu', code: 'ACB', color: '#F7941D' },
  {
    id: 'sacombank',
    name: 'Sacombank',
    fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín',
    code: 'STB',
    color: '#ED1C24',
  },
  {
    id: 'tpbank',
    name: 'TPBank',
    fullName: 'Ngân hàng TMCP Tiên Phong',
    code: 'TPB',
    color: '#8C52FF',
  },
  {
    id: 'vib',
    name: 'VIB',
    fullName: 'Ngân hàng TMCP Quốc Tế Việt Nam',
    code: 'VIB',
    color: '#FFDD00',
  },
  {
    id: 'shb',
    name: 'SHB',
    fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội',
    code: 'SHB',
    color: '#EC2029',
  },
  {
    id: 'hdbank',
    name: 'HDBank',
    fullName: 'Ngân hàng TMCP Phát Triển TP.HCM',
    code: 'HDB',
    color: '#00A651',
  },
  { id: 'ocb', name: 'OCB', fullName: 'Ngân hàng TMCP Phương Đông', code: 'OCB', color: '#0068B5' },
];

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
          <div className="font-black text-[#1A2948] text-lg mb-1 font-koho">
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
          <h3 className="font-black text-[#1A2948] text-xl mb-2 font-koho">{title}</h3>
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

export default function PaymentClient() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [saveAccount, setSaveAccount] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<
    Array<{ bankId: string; accountNumber: string; accountHolder: string }>
  >([]);
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
  const toast = useToast();
  const [adminAccounts, setAdminAccounts] = useState<BankAccount[]>([]);
  const [selectedAdminAccount, setSelectedAdminAccount] = useState<BankAccount | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  // Load saved bank accounts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vjsim_saved_bank_accounts');
      if (saved) {
        setSavedAccounts(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
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
      }
    } catch {
      // Fallback to empty
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
    // Validate bank transfer form
    if (paymentMethod === 'bank') {
      if (!selectedBank) {
        setPaymentError('Vui lòng chọn ngân hàng');
        setShowErrorModal(true);
        return;
      }
      if (!bankAccountNumber || bankAccountNumber.length < 6) {
        setPaymentError('Vui lòng nhập số tài khoản hợp lệ (tối thiểu 6 số)');
        setShowErrorModal(true);
        return;
      }
      if (!bankAccountHolder || bankAccountHolder.trim().length < 2) {
        setPaymentError('Vui lòng nhập tên chủ tài khoản');
        setShowErrorModal(true);
        return;
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
    setLoading(true);
    setPaymentError(null);
    setShowErrorModal(false);
    try {
      if (!booking?.bookingId) {
        throw new Error('Không tìm thấy thông tin đặt chỗ');
      }

      // M3: Call real POST /api/thanh-toan instead of fake timeout
      await createPayment({
        booking_id: booking.bookingId,
        method: paymentMethod,
        amount: total,
        discount_code_id: promoData?.id ?? undefined,
        discount_amount: discountAmount,
      });

      setLoading(false);
      setConfirmed(true);
      // Save bank account if user chose to
      if (paymentMethod === 'bank' && selectedBank && saveAccount) {
        const newAccount = {
          bankId: selectedBank.id,
          accountNumber: bankAccountNumber,
          accountHolder: bankAccountHolder,
        };
        const updated = [
          ...savedAccounts.filter((a) => a.accountNumber !== bankAccountNumber),
          newAccount,
        ];
        setSavedAccounts(updated);
        localStorage.setItem('vjsim_saved_bank_accounts', JSON.stringify(updated));
      }
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
    if (!booking) return 'Tôi vừa đặt vé thành công trên VietJet!';
    return `Tôi vừa đặt vé thành công trên VietJet!\n✈️ ${booking.flightNo}: ${booking.fromCity} → ${booking.toCity}\n📅 ${booking.date} | ${booking.departTime} - ${booking.arriveTime}\n🎫 Mã đặt chỗ: ${bookingCodeLabel}`;
  }, [booking, bookingCodeLabel]);

  const handleShareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Đặt vé VietJet thành công!', text: shareText });
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
                          {booking.date}
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

                {/* Bank Payment Info (if paid via bank transfer) */}
                {paymentMethod === 'bank' && selectedBank && (
                  <div className="mt-4 bg-[rgb(var(--blue-rgb))]/10 border border-[rgb(var(--blue-rgb))]/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: selectedBank.color }}
                      >
                        {selectedBank.code.substring(0, 2)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--blue)] uppercase tracking-wider block">
                          Thanh toán qua ngân hàng
                        </span>
                        <span className="text-xs text-[var(--blue)]">{selectedBank.fullName}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm bg-[var(--background)] rounded-lg p-3 border border-[rgb(var(--blue-rgb))]/20">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--foreground-muted)] text-xs">Số tài khoản</span>
                        <span className="font-mono font-bold text-[var(--foreground)]">
                          {bankAccountNumber}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-[var(--border)] " />
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--foreground-muted)] text-xs">
                          Chủ tài khoản
                        </span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {bankAccountHolder}
                        </span>
                      </div>
                      <div className="border-t border-dashed border-[var(--border)] " />
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--foreground-muted)] text-xs">Mã ngân hàng</span>
                        <span className="font-mono text-xs font-semibold text-[var(--foreground-muted)]">
                          {selectedBank.code}
                        </span>
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

                {/* QR Mock */}
                <div className="mt-5 flex flex-col items-center">
                  <div className="w-28 h-28 bg-[var(--surface-2)] rounded-xl flex items-center justify-center border-2 border-dashed border-[var(--border)] ">
                    <div className="text-center">
                      <Icon
                        name="QrCodeIcon"
                        size={40}
                        className="text-[var(--foreground-subtle)] mx-auto"
                      />
                      <div className="text-xs text-[var(--foreground-subtle)] mt-1">
                        QR Check-in
                      </div>
                    </div>
                  </div>
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
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1877F2] text-white text-xs font-semibold hover:bg-[#166fe5] transition-all hover:-translate-y-0.5 hover:shadow-md"
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
      <div className="pt-[128px] pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Thanh toán</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Payment Method */}
              <div
                className="bg-white rounded-2xl border border-[var(--border)] p-5"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)' }}
              >
                <h2 className="font-bold text-[var(--foreground)] mb-4">Phương thức thanh toán</h2>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {(
                    [
                      ['card', 'Thẻ tín dụng', 'CreditCardIcon'],
                      ['bank', 'Ngân hàng', 'BuildingLibraryIcon'],
                      ['wallet', 'Số dư Ví', 'WalletIcon'],
                      ['e_wallet', 'Ví MoMo/VNPay', 'DevicePhoneMobileIcon'],
                    ] as [
                      PaymentMethod,
                      string,
                      (
                        | 'CreditCardIcon'
                        | 'BuildingLibraryIcon'
                        | 'DevicePhoneMobileIcon'
                        | 'WalletIcon'
                      ),
                    ][]
                  ).map(([val, label, icon]) => (
                    <button
                      key={val}
                      onClick={() => setPaymentMethod(val)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all text-sm font-semibold ${
                        paymentMethod === val
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border)] '
                      }`}
                    >
                      <Icon name={icon} size={22} />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={handlePayment}>
                  {/* Card Form */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
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
                            className={`w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-mono form-input ${cardNumber.replace(/\s/g, '').length === 16 ? 'form-input-valid' : ''}`}
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
                            className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold form-input uppercase ${cardName.trim().length >= 3 ? 'form-input-valid' : ''}`}
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
                              className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm form-input ${expiry.length === 5 ? 'form-input-valid' : ''}`}
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
                              onChange={(e) =>
                                setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))
                              }
                              placeholder=" "
                              className={`w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm form-input ${cvv.length === 3 ? 'form-input-valid' : ''}`}
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
                      <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-2">
                        Chọn ngân hàng
                      </label>
                      {/* Saved Accounts */}
                      {savedAccounts.length > 0 && (
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-[var(--foreground-subtle)] uppercase tracking-wider mb-2">
                            Tài khoản đã lưu
                          </label>
                          <div className="space-y-2">
                            {savedAccounts.map(
                              (
                                acc: {
                                  bankId: string;
                                  accountNumber: string;
                                  accountHolder: string;
                                },
                                idx: number
                              ) => {
                                const bank = BANKS.find((b) => b.id === acc.bankId);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      if (bank) setSelectedBank(bank);
                                      setBankAccountNumber(acc.accountNumber);
                                      setBankAccountHolder(acc.accountHolder);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 bg-[var(--surface)] hover:bg-primary-50 border border-[var(--border)] hover:border-primary rounded-xl transition-all text-left"
                                  >
                                    {bank && (
                                      <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                        style={{ backgroundColor: bank.color }}
                                      >
                                        {bank.code.substring(0, 2)}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold text-[var(--foreground)] truncate">
                                        {acc.accountHolder}
                                      </div>
                                      <div className="text-xs text-[var(--foreground-muted)] font-mono">
                                        **** {acc.accountNumber.slice(-4)}
                                      </div>
                                    </div>
                                    <Icon
                                      name="ArrowRightIcon"
                                      size={16}
                                      className="text-[var(--foreground-subtle)]"
                                    />
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {BANKS.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBank(bank)}
                            className={`relative py-3 px-3 border rounded-xl text-sm font-semibold transition-all flex flex-col items-center gap-1.5 ${
                              selectedBank?.id === bank.id
                                ? 'border-2 shadow-md'
                                : 'bg-[var(--surface)] hover:bg-primary-50 hover:border-primary border-[var(--border)] text-[var(--foreground-muted)]'
                            }`}
                            style={
                              selectedBank?.id === bank.id
                                ? { borderColor: bank.color, backgroundColor: `${bank.color}08` }
                                : undefined
                            }
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: bank.color }}
                            >
                              {bank.code.substring(0, 2)}
                            </div>
                            <span className="text-xs font-medium text-center leading-tight">
                              {bank.name}
                            </span>
                            {selectedBank?.id === bank.id && (
                              <div
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                                style={{ backgroundColor: bank.color }}
                              >
                                ✓
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Bank Account Form */}
                      <div className="bg-white border border-[var(--border)] rounded-xl p-4 space-y-3 mt-2">
                        <h4 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                          <Icon name="BanknotesIcon" size={18} className="text-primary" />
                          Thông tin tài khoản thụ hưởng
                        </h4>
                        <div>
                          <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                            Số tài khoản <span className="text-primary">*</span>
                          </label>
                          <input
                            type="text"
                            value={bankAccountNumber}
                            onChange={(e) =>
                              setBankAccountNumber(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="Nhập số tài khoản"
                            className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                            Tên chủ tài khoản <span className="text-primary">*</span>
                          </label>
                          <input
                            type="text"
                            value={bankAccountHolder}
                            onChange={(e) => setBankAccountHolder(e.target.value)}
                            placeholder="Nhập tên chủ tài khoản"
                            className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                      </div>

                      {/* Save Account Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAccount}
                          onChange={(e) => setSaveAccount(e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border)] text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-[var(--foreground-muted)]">
                          Lưu tài khoản này cho lần thanh toán sau
                        </span>
                      </label>

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
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
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
                                  <div className="text-[10px] font-black text-primary">
                                    {selectedAdminAccount.admin_bank_name.substring(0, 3)}
                                  </div>
                                </div>
                              </div>

                              {/* QR Code Section */}
                              <div className="flex flex-col items-center justify-center py-4 bg-[var(--surface)] rounded-2xl border border-[var(--border)] mb-4">
                                <div className="relative group cursor-pointer">
                                  {/* QR must not be proxied/optimized: resizing corrupts scannability. */}
                                  {}
                                  <img
                                    src={`https://img.vietqr.io/image/${selectedAdminAccount.bank_bin || 'VCB'}-${selectedAdminAccount.admin_bank_account_number}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(transferNote)}&accountName=${encodeURIComponent(selectedAdminAccount.admin_bank_account_holder)}`}
                                    alt="VietQR"
                                    className="w-48 h-48 object-contain rounded-lg transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                                      Quét để trả ngay
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-[var(--foreground-subtle)] mt-2 font-medium">
                                  Sử dụng App Ngân hàng hoặc Ví để quét mã
                                </p>
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                  <div>
                                    <label className="text-[10px] font-bold text-[var(--foreground-subtle)] uppercase tracking-widest block mb-0.5">
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
                                    <label className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block mb-0.5">
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
                                  <label className="text-[10px] font-bold text-[var(--foreground-subtle)] uppercase tracking-widest block mb-1">
                                    Chủ tài khoản
                                  </label>
                                  <p className="text-sm font-bold text-[var(--foreground)]">
                                    {selectedAdminAccount.admin_bank_account_holder.toUpperCase()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-[var(--foreground)] p-3 flex items-center justify-center gap-2">
                              <Icon
                                name="ShieldCheckIcon"
                                size={14}
                                className="text-[var(--vj-green)]"
                              />
                              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                                Giao dịch bảo mật VietQR
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
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

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-vj-btn hover:shadow-vj-btn-hover hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 text-base"
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
                        Đang xử lý thanh toán...
                      </>
                    ) : (
                      <>
                        <Icon name="LockClosedIcon" size={18} />
                        Thanh toán {total.toLocaleString('vi-VN')}₫
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
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5 sticky top-[140px]">
                <h3 className="font-bold text-[var(--foreground)] mb-4">Chi tiết đơn hàng</h3>

                {/* Flight summary */}
                <div className="bg-primary-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-gradient-red rounded-lg flex items-center justify-center">
                      <Icon name="PaperAirplaneIcon" size={12} className="text-white" />
                    </div>
                    <span className="font-bold text-primary text-sm">{booking?.flightNo}</span>
                    <span className="text-xs text-[var(--foreground-subtle)] ml-auto">
                      {booking?.date}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-black text-[var(--foreground)]">
                        {booking?.departTime}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {booking?.from} · {booking?.fromCity}
                      </div>
                    </div>
                    <Icon
                      name="ArrowRightIcon"
                      size={14}
                      className="text-[var(--foreground-subtle)]"
                    />
                    <div className="text-right">
                      <div className="text-lg font-black text-[var(--foreground)]">
                        {booking?.arriveTime}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {booking?.to} · {booking?.toCity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger list */}
                {booking?.passengers.map((p: { name: string; seat: string }, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 text-sm border-b border-[var(--border)] "
                  >
                    <span className="text-[var(--foreground-muted)]">{p.name}</span>
                    <span className="font-semibold text-[var(--foreground)]">Ghế {p.seat}</span>
                  </div>
                ))}

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
                        className={`w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm form-input font-mono disabled:opacity-50 ${promoApplied ? 'form-input-valid' : ''}`}
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
                  className="mt-4 flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)] transition-colors"
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
    </>
  );
}
