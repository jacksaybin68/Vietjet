'use client';
import React, { useEffect, useState } from 'react';
import {
  buildBoardingQrContent,
  code39Svg,
  type ETicketData,
  type ETicketPassenger,
} from '../e-ticket';

/**
 * Thẻ lên máy bay điện tử hiển thị sau khi thanh toán thành công:
 * QR thật (sinh bằng package `qrcode` từ dữ liệu PNR/chuyến bay) +
 * mã vạch Code 39 của PNR, layout perforation kiểu vé giấy.
 */

interface EBoardingPassProps {
  data: ETicketData;
  passenger: ETicketPassenger;
}

export default function EBoardingPass({ data, passenger }: EBoardingPassProps) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = await import('qrcode');
        const content = buildBoardingQrContent(data, passenger);
        const svg = await QRCode.toString(content, {
          type: 'svg',
          margin: 1,
          width: 132,
          errorCorrectionLevel: 'M',
          color: { dark: '#111827', light: '#FFFFFF' },
        });
        if (!cancelled) setQrSvg(svg);
      } catch {
        // QR tạm không render được — mã vạch bên dưới vẫn dùng để soát.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, passenger]);

  const barcode = code39Svg(data.pnr);

  return (
    <div
      data-testid="eboarding-pass"
      className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-md"
    >
      {/* Header đỏ — thương hiệu + PNR. */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <div className="h-6 px-1.5 bg-white/15 rounded flex items-center shrink-0">
          <img
            src="/logo-internal.svg"
            alt="Vietjet Air"
            className="h-3.5 w-auto brightness-0 invert"
          />
        </div>
        <span className="text-xs font-black text-white/90 uppercase tracking-widest">
          Thẻ lên tàu điện tử
        </span>
        <span className="ml-auto font-mono font-black text-white text-sm tracking-[0.2em]">
          {data.pnr || '—'}
        </span>
      </div>

      {/* Thông tin hành khách + chuyến bay. */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-y-2.5 gap-x-2">
        <div className="col-span-3">
          <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
            Hành khách
          </div>
          <div className="font-black text-[var(--foreground)] text-sm">
            {passenger.name.toUpperCase()}
          </div>
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
            Từ
          </div>
          <div className="font-black text-[var(--foreground)]">{data.from}</div>
          <div className="text-xs text-[var(--foreground-muted)]">{data.departTime}</div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="text-xs text-[var(--foreground-subtle)]">{data.flightNo}</div>
          <div className="w-full h-px bg-[var(--border)] my-1" />
          <div className="text-xs text-[var(--foreground-subtle)]">Bay thẳng</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
            Đến
          </div>
          <div className="font-black text-[var(--foreground)]">{data.to}</div>
          <div className="text-xs text-[var(--foreground-muted)]">{data.arriveTime}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
            Ngày bay
          </div>
          <div className="text-xs font-bold text-[var(--foreground)]">{data.date}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
            Giờ lên máy bay
          </div>
          <div className="text-xs font-bold text-[var(--foreground)]">—</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[var(--foreground-subtle)] uppercase tracking-widest">
            Ghế
          </div>
          <div className="text-xs font-black text-primary">{passenger.seat || '—'}</div>
        </div>
      </div>

      {/* Perforation — vạch đứt chia đôi vé + notch hai bên. */}
      <div className="relative my-1">
        <div className="border-t-2 border-dashed border-[var(--border)]" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FFF9E6] rounded-full -ml-2 border border-[var(--border)]" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FFF9E6] rounded-full -mr-2 border border-[var(--border)]" />
      </div>

      {/* QR + mã vạch. */}
      <div className="px-4 py-3 flex items-center gap-4 bg-[#FFFDF3]">
        <div
          className="shrink-0 [&>svg]:w-[132px] [&>svg]:h-[132px]"
          data-testid="eboarding-qr"
          dangerouslySetInnerHTML={{ __html: qrSvg ?? '' }}
        />
        <div className="min-w-0 flex-1">
          {barcode ? (
            <div
              className="[&>svg]:w-full [&>svg]:h-10"
              data-testid="eboarding-barcode"
              dangerouslySetInnerHTML={{ __html: barcode }}
            />
          ) : null}
          <div className="mt-1 text-center font-mono text-xs font-bold tracking-[0.3em] text-[var(--foreground-muted)]">
            {data.pnr || '—'}
          </div>
          <div className="mt-1 text-xs text-center text-[var(--foreground-subtle)]">
            Xuất trình QR hoặc mã vạch tại cổng lên máy bay
          </div>
        </div>
      </div>
    </div>
  );
}
