'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MdDownload, MdShare, MdPrint } from 'react-icons/md';
import {
  buildBoardingQrContent,
  code39Svg,
  type ETicketData,
  type ETicketPassenger,
} from '../e-ticket';

export interface BoardingPassCardProps {
  data: ETicketData;
  passenger: ETicketPassenger;
  /** 'outbound' | 'inbound' — hiển thị trên thẻ. */
  legRole?: 'outbound' | 'inbound';
  /** Cổng ra máy bay. */
  gate?: string | null;
  /** Nhà ga. */
  terminal?: string | null;
  /** Mã số thẻ lên máy bay. */
  boardingPassNumber?: string | null;
  /**
   * Nhúng PDF tải về. Đường dẫn tới endpoint `GET /api/dat-ve/[id]/ve-dien-tu`.
   * Không truyền thì nút tải PDF bị ẩn.
   */
  pdfUrl?: string | null;
}

/**
 * Thẻ lên máy bay điện tử.
 *
 * Ba thứ khách cần ở sân bay, và cả ba đều là thật:
 *   - **QR** sinh từ package `qrcode` (SVG, `errorCorrectionLevel: 'M'`),
 *     nội dung là payload BCBP-lite do `buildBoardingQrContent` dựng — cùng
 *     hàm mà PDF dùng, nên QR trên màn hình và QR trong PDF không thể lệch.
 *   - **Mã vạch Code 39** vẽ bằng vector (`code39Svg`), không phụ thuộc font.
 *   - **Số thẻ** in rõ để nhân viên đối chiếu khi máy quét QR hỏng.
 *
 * Trước đây `/lam-thu-tuc` chỉ vẽ một icon `<MdQrCode2>` — không phải mã, nên
 * không quét được. Đó là lý do phần này được viết lại thay vì tái dùng.
 */
export default function BoardingPassCard({
  data,
  passenger,
  legRole = 'outbound',
  gate,
  terminal,
  boardingPassNumber,
  pdfUrl,
}: BoardingPassCardProps) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'shared' | 'failed'>('idle');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = await import('qrcode');
        const content = buildBoardingQrContent(data, passenger);
        const svg = await QRCode.toString(content, {
          type: 'svg',
          margin: 1,
          // 240px: quét được trên màn hình điện thoại, in ra vẫn sắc nét
          // (SVG là vector nên phóng to không vỡ).
          width: 240,
          errorCorrectionLevel: 'M',
          color: { dark: '#111827', light: '#FFFFFF' },
        });
        if (!cancelled) setQrSvg(svg);
      } catch {
        // QR tạm không render được — mã vạch bên dưới vẫn dùng được để soát.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, passenger]);

  const barcode = code39Svg(data.pnr);

  /** Tải PDF vé điện tử (mở tab mới để trình duyệt xử lý). */
  const handleDownloadPdf = useCallback(() => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank', 'noopener');
  }, [pdfUrl]);

  /**
   * Tải ảnh PNG của thẻ về điện thoại.
   *
   * Cách này không phụ thuộc vào PDF: `html2canvas` không có trong repo, nên
   * thẻ được vẽ lại vào một `<canvas>` từ dữ liệu QR + mã vạch. Thẻ vẽ tay
   * giữ được bố cục và không kéo theo phụ thuộc nặng.
   */
  const handleDownloadImage = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const QRCode = await import('qrcode');
      const content = buildBoardingQrContent(data, passenger);
      const qrDataUrl = await QRCode.toDataURL(content, {
        width: 600,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#111827', light: '#FFFFFF' },
      });

      const canvas = document.createElement('canvas');
      const width = 900;
      const height = 520;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Nền trắng.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Header đỏ thương hiệu.
      ctx.fillStyle = '#EC2029';
      ctx.fillRect(0, 0, width, 86);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('VIETJET AIR', 28, 46);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(data.pnr || '', width - 28 - ctx.measureText(data.pnr || '').width, 46);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(legRole === 'inbound' ? 'CHẶNG VỀ' : 'CHẶNG ĐI', 28, 132);
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(`${data.from} → ${data.to}`, 28, 186);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(
        `${data.flightNo} · ${data.date} · ${data.departTime} – ${data.arriveTime}`,
        28,
        218
      );

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`HÀNH KHÁCH: ${passenger.name.toUpperCase()}`, 28, 268);
      ctx.fillText(`GHẾ: ${passenger.seat || '—'}`, 28, 300);
      if (gate || terminal) {
        ctx.fillText(`CỬA: ${gate || '—'} · NHÀ GA: ${terminal || '—'}`, 28, 332);
      }
      if (boardingPassNumber) {
        ctx.fillText(`SỐ THẺ: ${boardingPassNumber}`, 28, 364);
      }

      // QR.
      const qrImage = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImage.onload = () => resolve();
        qrImage.onerror = () => reject(new Error('QR image failed'));
        qrImage.src = qrDataUrl;
      });
      ctx.drawImage(qrImage, width - 300, 120, 260, 260);

      // Mã vạch Code 39 — vẽ vector, không phụ thuộc font.
      ctx.fillStyle = '#111827';
      const barcodeText = (data.pnr || '').toUpperCase().replace(/[^0-9A-Z\-. ]/g, '');
      if (barcodeText) {
        let x = 28;
        const barHeight = 70;
        const y = 420;
        const total = barcodeText.length + 2;
        const barWidth = (width - 56) / (total * 12);
        const patterns: Record<string, string> = {
          '0': '000110100',
          '1': '100100001',
          '2': '001100001',
          '3': '101100000',
          '4': '000110001',
          '5': '100110000',
          '6': '001110000',
          '7': '000100101',
          '8': '100100100',
          '9': '001100100',
          A: '100001001',
          B: '001001001',
          C: '101001000',
          D: '000011001',
          E: '100011000',
          F: '001011000',
          G: '000001101',
          H: '100001100',
          I: '001001100',
          J: '000011100',
          K: '100000011',
          L: '001000011',
          M: '101000010',
          N: '000010011',
          O: '100010010',
          P: '001010010',
          Q: '000000111',
          R: '100000110',
          S: '001000110',
          T: '000010110',
          U: '110000001',
          V: '011000001',
          W: '111000000',
          X: '010010001',
          Y: '110010000',
          Z: '011010000',
          '-': '010000101',
          '.': '110000100',
          ' ': '011000100',
          '*': '010010100',
        };
        for (const ch of `*${barcodeText}*`) {
          const pattern = patterns[ch];
          if (!pattern) continue;
          for (let i = 0; i < 9; i++) {
            const w = (pattern[i] === '1' ? 3 : 1) * barWidth;
            if (i % 2 === 0) ctx.fillRect(x, y, w, barHeight);
            x += w;
          }
          x += barWidth;
        }
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boarding-pass-${data.pnr || 'vietjet'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Không tải được ảnh thì khách vẫn dùng được nút tải PDF.
    }
  }, [data, passenger, legRole, gate, terminal, boardingPassNumber]);

  /**
   * Chia sẻ thẻ lên máy bay qua Web Share API.
   *
   * `navigator.share` chỉ tồn tại trên trình duyệt di động (và trên desktop
   * Chrome/Edge mới). Không có nó thì nút bị ẩn — một nút luôn bấm được rồi
   * không làm gì là tệ hơn không có nút.
   */
  const handleShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    setShareState('sharing');
    try {
      if (navigator.canShare && pdfUrl) {
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const file = new File([blob], `ve-dien-tu-${data.pnr}.pdf`, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Thẻ lên máy bay ${data.pnr}`,
            text: `Thẻ lên máy bay Vietjet Air — mã đặt chỗ ${data.pnr}`,
            files: [file],
          });
          setShareState('shared');
          return;
        }
      }
      await navigator.share({
        title: `Thẻ lên máy bay ${data.pnr}`,
        text: `Thẻ lên máy bay Vietjet Air — mã đặt chỗ ${data.pnr}`,
        url: pdfUrl ?? window.location.href,
      });
      setShareState('shared');
    } catch {
      setShareState('failed');
    }
  }, [data.pnr, pdfUrl]);

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        data-testid="boarding-pass-card"
        className="overflow-hidden rounded-vj border border-[var(--border)] bg-[var(--background)] shadow-vj-lg"
      >
        {/* Header đỏ — thương hiệu + PNR + chặng. */}
        <div className="vj-menubar px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black italic text-[var(--vj-yellow)]">Vietjet Air</span>
            <span className="ml-auto text-2xs uppercase text-white/70">
              Boarding Pass · {legRole === 'inbound' ? 'Chặng về' : 'Chặng đi'} · {data.flightNo}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 bg-[var(--vj-red)] text-white text-sm font-bold uppercase">
          <span>Gate {gate || '—'}</span>
          <span>{terminal || '—'}</span>
          <span>Seat {passenger.seat || '—'}</span>
        </div>

        <div className="px-5 py-5 border-t border-[var(--vj-sky)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-[var(--vj-text)]">{data.from}</p>
              <p className="text-xs2 text-[var(--vj-text-muted)]">
                {data.departTime} · {data.date}
              </p>
            </div>
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-[var(--vj-red)]" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
            </svg>
            <div className="text-right">
              <p className="text-3xl font-black text-[var(--vj-text)]">{data.to}</p>
              <p className="text-xs2 text-[var(--vj-text-muted)]">{data.arriveTime}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-6 text-center">
            <div>
              <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">Hành khách</p>
              <p className="text-sm2 font-bold text-[var(--vj-text)]">
                {passenger.name.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">Mã đặt chỗ</p>
              <p className="text-sm2 font-bold text-[var(--vj-text)]">{data.pnr || '—'}</p>
            </div>
          </div>

          {boardingPassNumber && (
            <div className="mt-3 grid grid-cols-2 gap-x-6 text-center">
              <div>
                <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                  Check-in No.
                </p>
                <p className="text-sm2 font-bold text-[var(--vj-red)]">{boardingPassNumber}</p>
              </div>
              <div>
                <p className="text-2xs font-bold uppercase text-[var(--vj-text-muted)]">
                  Số thẻ lên máy bay
                </p>
                <p className="text-sm2 font-bold text-[var(--vj-red)]">{boardingPassNumber}</p>
              </div>
            </div>
          )}

          {/* QR thật + mã vạch Code 39. */}
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div
              data-testid="boarding-qr"
              className="shrink-0 rounded-vj border border-[var(--border)] bg-white p-1 [&>svg]:h-[180px] [&>svg]:w-[180px]"
              dangerouslySetInnerHTML={{ __html: qrSvg ?? '' }}
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              {barcode ? (
                <div
                  data-testid="boarding-barcode"
                  className="[&>svg]:h-10 [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: barcode }}
                />
              ) : null}
              <p className="mt-1 font-mono text-xs font-bold tracking-[0.3em] text-[var(--vj-text-muted)]">
                {data.pnr || '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--vj-text-gray)]">
                Xuất trình QR hoặc mã vạch tại cổng lên máy bay.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hành động: tải về điện thoại. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {pdfUrl && (
          <button
            type="button"
            onClick={handleDownloadPdf}
            data-testid="download-pdf"
            className="vj-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium uppercase shadow-lg transition-colors"
          >
            <MdDownload className="h-4 w-4" />
            Tải vé PDF
          </button>
        )}
        <button
          type="button"
          onClick={handleDownloadImage}
          data-testid="download-image"
          className="inline-flex items-center gap-2 rounded-vj border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--background)] px-5 py-2.5 text-xs font-bold uppercase text-[var(--vj-text-gray)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <MdDownload className="h-4 w-4" />
          Tải ảnh PNG
        </button>
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            data-testid="share-pass"
            className="inline-flex items-center gap-2 rounded-vj border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--background)] px-5 py-2.5 text-xs font-bold uppercase text-[var(--vj-text-gray)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <MdShare className="h-4 w-4" />
            {shareState === 'shared' ? 'Đã chia sẻ' : 'Chia sẻ'}
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-vj border border-[rgb(var(--vj-navy-rgb))]/20 bg-[var(--background)] px-5 py-2.5 text-xs font-bold uppercase text-[var(--vj-text-gray)] transition-colors hover:bg-[var(--surface-2)]"
        >
          <MdPrint className="h-4 w-4" />
          In thẻ
        </button>
      </div>
    </div>
  );
}
