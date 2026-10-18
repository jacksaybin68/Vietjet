'use client';

import React from 'react';
import ContinueButton from './ContinueButton';

export interface BookingSummaryData {
  trip: string; // "SGN → HAN"
  date: string; // "16/10/2026"
  flightNo?: string;
  fare?: number;
  tax?: number;
  serviceFee?: number;
  total: number;
  isRoundTrip?: boolean;
}

interface BookingSummaryPanelProps {
  data: BookingSummaryData;
  onContinue: () => void;
  canContinue: boolean;
}

export default function BookingSummaryPanel({
  data,
  onContinue,
  canContinue,
}: BookingSummaryPanelProps) {
  return (
    <aside className="hidden lg:flex lg:w-[360px] flex-col gap-6">
      {/* Panel header */}
      <div className="rounded-t-xl bg-vjred p-5 text-white">
        <h2 className="text-lg font-black uppercase tracking-wide">THÔNG TIN ĐẶT CHỐ</h2>
      </div>

      {/* Section: Chuyến đi */}
      <section className="bg-vjpanelblue p-4">
        <h3 className="text-xs font-bold text-vjbrown uppercase tracking-wider mb-3">Chuyến đi</h3>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-vjdark uppercase tracking-wider font-bold mb-0.5">
              {data.trip.split('→')[0].trim()}
            </p>
            <p className="text-xl font-black text-vjdark">{data.trip.split('→')[1].trim()}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] text-vjdark uppercase tracking-wider font-bold mb-0.5">
              Ngày bay
            </p>
            <p className="text-xl font-black text-vjdark">{data.date}</p>
          </div>
        </div>
      </section>

      {/* Section: Giá vé */}
      <section className="bg-vjpanelblue p-4">
        <h3 className="text-xs font-bold text-vjbrown uppercase tracking-wider mb-3">Giá vé</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] text-vjdark uppercase tracking-wider font-bold mb-1">tarif</p>
            <p className="text-lg font-black text-vjdark">
              {data.fare?.toLocaleString('vi-VN') ?? '0'}đ
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-vjdark uppercase tracking-wider font-bold mb-1">
              Thuế, phí
            </p>
            <p className="text-lg font-black text-vjdark">
              {(data.tax ?? 0).toLocaleString('vi-VN')}đ
            </p>
          </div>
        </div>
      </section>

      {/* Section: Dịch vụ */}
      <section className="bg-vjpanelblue p-4">
        <h3 className="text-xs font-bold text-vjbrown uppercase tracking-wider mb-3">Dịch vụ</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-vjdark">Dịch vụ đi kèm</span>
          <span className="text-lg font-black text-vjdark">
            {data.serviceFee?.toLocaleString('vi-VN') ?? '0'}đ
          </span>
        </div>
      </section>

      {/* Section: Tổng tiền */}
      <div className="bg-vjbgs p-4 border-t border-black/10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-vjdark">Tổng thanh toán</span>
          <span className="text-xl font-black text-vjred">
            {data.total.toLocaleString('vi-VN')}đ
          </span>
        </div>
        <ContinueButton onClick={onContinue} disabled={!canContinue} label="Đi tiếp" />
      </div>
    </aside>
  );
}
