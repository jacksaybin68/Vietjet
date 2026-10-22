'use client';

import React, { useEffect } from 'react';
import { Icon } from '@/shared/components/ui';
import type { FareClassId } from '@/features/bookings/pricing';

/**
 * The four fare buckets sold on the results page, in the order the cards show
 * them (cheapest first, matching `FARE_CLASSES` in the booking pricing module).
 */
const FARE_COLUMNS: readonly {
  id: FareClassId;
  label: string;
  /** Same swatch the card header paints for this bucket. */
  headerClass: string;
  priceColor: string;
}[] = [
  {
    id: 'eco',
    label: 'Eco',
    headerClass: 'bg-[var(--surface-2)] text-[var(--foreground)]',
    priceColor: 'text-[var(--foreground)]',
  },
  {
    id: 'deluxe',
    label: 'Deluxe',
    headerClass: 'bg-[var(--surface-2)] text-[var(--foreground)]',
    priceColor: 'text-[var(--foreground)]',
  },
  {
    id: 'skyboss',
    label: 'skyBOSS',
    headerClass: 'bg-[var(--surface-2)] text-[var(--foreground)]',
    priceColor: 'text-[var(--foreground)]',
  },
  {
    id: 'business',
    label: 'Business',
    headerClass: 'bg-[var(--surface-2)] text-[var(--foreground)]',
    priceColor: 'text-[var(--foreground)]',
  },
] as const;

/** One row of the comparison table: a benefit and what each bucket gives. */
const BENEFIT_ROWS: readonly {
  label: string;
  values: Record<FareClassId, string>;
}[] = [
  {
    label: 'Hành lý xách tay',
    values: {
      eco: '7kg (túi 40×30×20cm)',
      deluxe: '7kg + túi cá nhân 3kg',
      skyboss: '10kg (túi 56×36×23cm)',
      business: '10kg + túi cá nhân 3kg',
    },
  },
  {
    label: 'Hành lý ký gửi',
    values: {
      eco: 'Không bao gồm (mua thêm từ 150.000đ)',
      deluxe: '20kg',
      skyboss: '30kg',
      business: '40kg',
    },
  },
  {
    label: 'Chọn trước chỗ ngồi',
    values: {
      eco: 'Trả phí theo dãy ghế (từ 45.000đ)',
      deluxe: 'Miễn phí dãy phổ thông',
      skyboss: 'Miễn phí toàn bộ ghế phổ thông',
      business: 'Miễn phí ghế thương gia',
    },
  },
  {
    label: 'Đổi vé',
    values: {
      eco: 'Phí 200.000đ/khách + chênh lệch giá',
      deluxe: 'Miễn phí 1 lần đổi + chênh lệch giá',
      skyboss: 'Không giới hạn lần đổi, chỉ trả chênh lệch',
      business: 'Miễn phí đổi, giữ giá đến 3 giờ trước bay',
    },
  },
  {
    label: 'Làm thủ tục & lên máy bay',
    values: {
      eco: 'Quầy phổ thông / web check-in',
      deluxe: 'Quầy ưu tiên',
      skyboss: 'Fast track + lên máy bay đầu tiên',
      business: 'Quầy thương gia + lên máy bay trước',
    },
  },
  {
    label: 'Phòng chờ sân bay',
    values: {
      eco: '—',
      deluxe: '—',
      skyboss: 'Phòng chờ Nội Bài, Tân Sơn Nhất',
      business: 'Phòng chờ + dịch vụ nghỉ dưỡng',
    },
  },
  {
    label: 'Suất ăn trên chuyến',
    values: {
      eco: 'Mua trên máy bay',
      deluxe: '1 suất ăn miễn phí',
      skyboss: 'Suất ăn + đồ uống miễn phí',
      business: 'Thực đơn theo yêu cầu',
    },
  },
  {
    label: 'Tích điểm SkyJoy',
    values: { eco: '1× điểm', deluxe: '1.5× điểm', skyboss: '2× điểm', business: '3× điểm' },
  },
] as const;

interface FareBenefitsModalProps {
  open: boolean;
  onClose: () => void;
  /** Bucket whose column is framed as "đang chọn". */
  highlight?: FareClassId;
  /** Per-passenger fares for the flight being looked at, keyed by bucket. */
  prices?: Partial<Record<FareClassId, number>>;
}

/**
 * Modal so sánh 4 hạng vé (Eco · Deluxe · skyBOSS · Business).
 *
 * Opened from a fare-class name: the coloured name strip on a flight card and
 * the "so sánh" control in the fare tabs both land here, so a traveller can read
 * the rights behind a bucket without leaving the results page.
 */
export default function FareBenefitsModal({
  open,
  onClose,
  highlight,
  prices,
}: FareBenefitsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fare-benefits-title"
        className="bg-[var(--surface)] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col"
        style={{ animation: 'fadeInUp 0.25s ease-out' }}
      >
        {/* Red accent bar — same treatment as every card header on the site. */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-[var(--border)]">
          <div>
            <h2
              id="fare-benefits-title"
              className="text-lg sm:text-xl font-black text-[var(--foreground)] font-koho"
            >
              So sánh hạng vé
            </h2>
            <p className="text-xs sm:text-sm text-[var(--foreground-muted)] mt-0.5">
              Eco · Deluxe · skyBOSS · Business — quyền lợi đi kèm từng hạng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng so sánh hạng vé"
            className="shrink-0 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] text-[var(--foreground-muted)] hover:text-primary hover:border-primary transition-colors"
          >
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>
        <div className="overflow-auto px-4 sm:px-6 py-4">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-[190px] sticky left-0 z-10 bg-[var(--surface)] pr-3 pb-3 align-bottom">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-subtle)]">
                    Quyền lợi
                  </span>
                </th>
                {FARE_COLUMNS.map((col) => {
                  const isHighlighted = highlight === col.id;
                  return (
                    <th key={col.id} className="px-1.5 pb-3 align-bottom">
                      <div
                        className={`rounded-lg overflow-hidden ${
                          isHighlighted ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <div className={`text-center py-1.5 px-1 flex items-center justify-center min-h-[30px] ${col.headerClass}`}>
                          {col.id === 'business' ? (
                            <img
                              src="/images/fare-classes/business-logo.png"
                              alt="Business"
                              className="h-3.5 w-auto object-contain brightness-0 invert"
                            />
                          ) : col.id === 'skyboss' ? (
                            <img
                              src="/images/fare-classes/skyboss-logo.png"
                              alt="skyBOSS"
                              className="h-3.5 w-auto object-contain brightness-0 invert"
                            />
                          ) : col.id === 'deluxe' ? (
                            <img
                              src="/images/fare-classes/deluxe-logo.png"
                              alt="Deluxe"
                              className="h-3.5 w-auto object-contain brightness-0 invert"
                            />
                          ) : (
                            <div className="text-xs font-black uppercase font-koho tracking-tight">
                              {col.label}
                            </div>
                          )}
                        </div>
                        {prices?.[col.id] != null && (
                          <div className="text-center py-1.5 bg-[var(--surface-2)] border-x border-b border-[var(--border)]">
                            <span className={`text-xs font-black font-koho ${col.priceColor}`}>
                              {prices[col.id]!.toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        )}
                      </div>
                      {isHighlighted && (
                        <div className="mt-1 text-center text-xs font-bold uppercase tracking-wider text-primary">
                          Đang chọn
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {BENEFIT_ROWS.map((row, index) => (
                <tr key={row.label} className="align-top">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[var(--surface)] pr-3 py-2.5 text-xs font-semibold text-[var(--foreground)] border-t border-[var(--border)]"
                  >
                    {row.label}
                  </th>
                  {FARE_COLUMNS.map((col) => {
                    const value = row.values[col.id];
                    const empty = value === '—';
                    return (
                      <td
                        key={col.id}
                        className={`px-1.5 py-2.5 border-t border-[var(--border)] text-xs leading-snug ${
                          highlight === col.id
                            ? 'bg-[rgb(var(--primary-rgb))]/5'
                            : index % 2 === 1
                              ? 'bg-[var(--surface-2)]/60'
                              : ''
                        }`}
                      >
                        {empty ? (
                          <span className="text-[var(--foreground-subtle)]">—</span>
                        ) : (
                          <span className="flex items-start gap-1">
                            <Icon
                              name="CheckIcon"
                              size={13}
                              className="mt-0.5 shrink-0 text-[var(--primary)]"
                            />
                            <span className="text-[var(--foreground)]">{value}</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 sm:px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-[var(--foreground-muted)]">
            Quyền lợi mang tính minh hoạ cho mục đích mô phỏng; điều kiện áp dụng theo quy định hiện
            hành của Vietjet.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 vj-btn vj-btn-sm vj-btn-accent rounded-xl font-bold font-koho"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
