'use client';

import React, { useState } from 'react';
import ContinueButton from './ContinueButton';
import { RiEditLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import PassengerDetailModal from './PassengerDetailModal';

export interface BookingSummaryData {
  trip: string; // "SGN → HAN"
  date: string; // "16/10/2026"
  flightNo?: string;
  fareClass?: string;
  fare?: number;
  tax?: number;
  serviceFee?: number;
  baggageFee?: number;
  insuranceFee?: number;
  departTime?: string;
  arriveTime?: string;
  total: number;
  isRoundTrip?: boolean;
  returnLeg?: {
    trip: string;
    date: string;
    flightNo?: string;
    fareClass?: string;
    fare?: number;
    tax?: number;
    total?: number;
    departTime?: string;
    arriveTime?: string;
  };
}

function formatViSummaryDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  let d: Date;
  if (parts.length === 3) {
    d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return dateStr;
  const dayOfWeek = d.getDay();
  const dowPrefix = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${dowPrefix}, ${day}/${month}/${year}`;
}

function formatFareClassName(fareClass?: string): string {
  if (!fareClass) return 'Eco';
  const lower = fareClass.toLowerCase();
  if (lower.includes('deluxe')) return 'Deluxe';
  if (lower.includes('boss')) return 'Skyboss';
  if (lower.includes('business') || lower.includes('biz')) return 'Business';
  return 'Eco';
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
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [showFareDetail, setShowFareDetail] = useState(true);
  const [showTaxDetail, setShowTaxDetail] = useState(false);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [showPassengerDetailModal, setShowPassengerDetailModal] = useState(false);

  const tripParts = (data.trip || '').split('→').map((s) => s.trim());
  const origin = tripParts[0] || 'Tp. Hồ Chí Minh (SGN)';
  const destination = tripParts[1] || 'Hà Nội (HAN)';

  const totalServices = (data.serviceFee ?? 0) + (data.baggageFee ?? 0) + (data.insuranceFee ?? 0);
  const outboundTotal = (data.fare ?? 0) + (data.tax ?? 0) + totalServices;

  const taxAmount = data.tax ?? 581581;
  const taxRatio = taxAmount > 0 ? taxAmount / 581581 : 1;
  const feeSecurity = Math.round(18181 * taxRatio);
  const feeAirport = Math.round(99000 * taxRatio);
  const feeSystemAdmin = Math.round(215000 * taxRatio);
  const feeDgm = Math.round(215000 * taxRatio);
  const feeVat = taxAmount - (feeSecurity + feeAirport + feeSystemAdmin + feeDgm);

  return (
    <>
      {/* Desktop Panel */}
      <aside className="hidden lg:flex lg:w-[340px] flex-col rounded-t-lg overflow-hidden shadow-sm border border-gray-200 bg-white h-fit sticky top-16">
        {/* Panel header — solid brand red */}
        <div className="bg-[#D71920] px-4 py-3 text-white text-center shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider font-koho">
            THÔNG TIN ĐẶT CHỖ
          </h2>
        </div>

        {/* Bar: Thông tin hành khách */}
        <div className="bg-[#F0F2F5] px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-800">
          <span>Thông tin hành khách</span>
        </div>

        {/* Section: Chuyến đi */}
        <div className="border-b border-gray-200/80">
          <div className="bg-[#CDE8F6] px-4 py-2 flex items-center justify-between text-xs font-bold text-[#006699] uppercase">
            <span>Chuyến đi</span>
            {data.flightNo && (
              <div className="flex items-center gap-1 text-[#D71920] font-black font-koho text-sm tracking-tight normal-case">
                <span>{outboundTotal.toLocaleString('vi-VN')} VND</span>
                <RiEditLine size={14} className="stroke-[1]" />
              </div>
            )}
          </div>

          <div className="p-3 space-y-1 bg-white">
            <div className="text-xs font-black text-gray-900 leading-tight">
              {origin} <span className="text-[#D71920]">✈</span> {destination}
            </div>
            <div className="text-2xs text-gray-500 font-semibold">
              {data.flightNo
                ? `${formatViSummaryDate(data.date)} | ${data.departTime || '04:40'} - ${data.arriveTime || '06:50'} | ${data.flightNo} | ${formatFareClassName(data.fareClass)}`
                : '--- | --- | --- | ---'}
            </div>
          </div>
        </div>

        {/* Bar: Giá vé */}
        <div
          className="bg-[#F0F2F5] px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer"
          onClick={() => setShowFareDetail(!showFareDetail)}
        >
          <span>Giá vé</span>
          {data.fare && data.fare > 0 ? (
            <div className="flex items-center gap-1 font-bold text-gray-950 font-koho text-xs sm:text-sm">
              <span>{data.fare.toLocaleString('vi-VN')} VND</span>
              <RiArrowDownSLine size={16} />
            </div>
          ) : null}
        </div>

        {/* Bar: Thuế, phí */}
        <div className="border-b border-gray-200/80">
          <div
            className="bg-[#F0F2F5] px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer"
            onClick={() => setShowTaxDetail(!showTaxDetail)}
          >
            <span>Thuế, phí</span>
            <div className="flex items-center gap-1 font-bold text-gray-950 font-koho text-xs sm:text-sm">
              {data.tax && data.tax > 0 ? (
                <span>{data.tax.toLocaleString('vi-VN')} VND</span>
              ) : (
                <span>581.581 VND</span>
              )}
              <RiArrowDownSLine size={16} />
            </div>
          </div>

          {showTaxDetail && (
            <div className="px-4 py-2 space-y-1 text-xs2 text-gray-500 bg-gray-50/70 border-t border-gray-100">
              <div className="flex justify-between">
                <span>Phí an ninh soi chiếu</span>
                <span>{feeSecurity.toLocaleString('vi-VN')} VND</span>
              </div>
              <div className="flex justify-between">
                <span>Domestic airport tax</span>
                <span>{feeAirport.toLocaleString('vi-VN')} VND</span>
              </div>
              <div className="flex justify-between">
                <span>Phí quản trị hệ thống</span>
                <span>{feeSystemAdmin.toLocaleString('vi-VN')} VND</span>
              </div>
              <div className="flex justify-between">
                <span>DGM management fee</span>
                <span>{feeDgm.toLocaleString('vi-VN')} VND</span>
              </div>
              <div className="flex justify-between">
                <span>Thuế VAT</span>
                <span>{feeVat.toLocaleString('vi-VN')} VND</span>
              </div>
            </div>
          )}
        </div>

        {/* Bar: Dịch vụ */}
        <div
          className="bg-[#F0F2F5] px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer"
          onClick={() => setShowServiceDetail(!showServiceDetail)}
        >
          <span>Dịch vụ</span>
          <div className="flex items-center gap-1 font-bold text-gray-950 font-koho text-xs sm:text-sm">
            <span>{totalServices.toLocaleString('vi-VN')} VND</span>
            <RiArrowDownSLine size={16} />
          </div>
        </div>

        {/* Section: Chuyến về (always present for roundtrip matching screenshot) */}
        {(data.isRoundTrip || data.returnLeg !== undefined) && (
          <div className="border-b border-gray-200/80">
            <div className="bg-[#CDE8F6] px-4 py-2 flex items-center justify-between text-xs font-bold text-[#006699] uppercase">
              <span>Chuyến về</span>
              {data.returnLeg?.flightNo && (
                <div className="flex items-center gap-1 text-[#D71920] font-black font-koho text-sm tracking-tight normal-case">
                  <span>
                    {(
                      data.returnLeg.total ?? (data.returnLeg.fare ?? 0) + (data.returnLeg.tax ?? 0)
                    ).toLocaleString('vi-VN')}{' '}
                    VND
                  </span>
                  <RiEditLine size={14} className="stroke-[1]" />
                </div>
              )}
            </div>
            <div className="p-3 space-y-1 bg-white text-xs">
              <div className="text-xs font-black text-gray-900 leading-tight">
                {destination} <span className="text-[#D71920]">✈</span> {origin}
              </div>
              <div className="text-2xs text-gray-500 font-semibold">
                {data.returnLeg?.flightNo
                  ? `${formatViSummaryDate(data.returnLeg.date ?? data.date)} | ${data.returnLeg.departTime || '---'} - ${data.returnLeg.arriveTime || '---'} | ${data.returnLeg.flightNo} | ${formatFareClassName(data.returnLeg.fareClass)}`
                  : '--- | --- | --- | ---'}
              </div>
            </div>

            {/* Bar: Giá vé (Chuyến về) */}
            <div className="bg-[#F0F2F5] px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-800">
              <span>Giá vé</span>
              {data.returnLeg?.fare && data.returnLeg.fare > 0 ? (
                <div className="flex items-center gap-1 font-bold text-gray-950 font-koho text-xs sm:text-sm">
                  <span>{data.returnLeg.fare.toLocaleString('vi-VN')} VND</span>
                  <RiArrowDownSLine size={16} />
                </div>
              ) : null}
            </div>

            {/* Bar: Thuế, phí (Chuyến về) */}
            <div className="bg-[#F0F2F5] px-4 py-2.5 flex items-center justify-between text-xs font-bold text-gray-800">
              <span>Thuế, phí</span>
              {data.returnLeg?.tax && data.returnLeg.tax > 0 ? (
                <div className="flex items-center gap-1 font-bold text-gray-950 font-koho text-xs sm:text-sm">
                  <span>{data.returnLeg.tax.toLocaleString('vi-VN')} VND</span>
                  <RiArrowDownSLine size={16} />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Section: Dịch vụ bổ sung */}
        {totalServices > 0 && (
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)] p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-[var(--foreground)]">
              <span>Dịch vụ bổ sung</span>
              <span className="text-[var(--primary)] font-black">
                {totalServices.toLocaleString('vi-VN')} VND
              </span>
            </div>
            {data.insuranceFee && data.insuranceFee > 0 ? (
              <div className="flex items-center justify-between text-xs2 text-[var(--foreground-muted)] pl-2">
                <span>Bảo hiểm Travel Safe</span>
                <span className="font-semibold">
                  {data.insuranceFee.toLocaleString('vi-VN')} VND
                </span>
              </div>
            ) : null}
            {data.baggageFee && data.baggageFee > 0 ? (
              <div className="flex items-center justify-between text-xs2 text-[var(--foreground-muted)] pl-2">
                <span>Gói hành lý ký gửi</span>
                <span className="font-semibold">{data.baggageFee.toLocaleString('vi-VN')} VND</span>
              </div>
            ) : null}
            {data.serviceFee && data.serviceFee > 0 ? (
              <div className="flex items-center justify-between text-xs2 text-[var(--foreground-muted)] pl-2">
                <span>Phí chọn chỗ ngồi</span>
                <span className="font-semibold">{data.serviceFee.toLocaleString('vi-VN')} VND</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Solid Red Total Bar at bottom of sidebar matching screenshot */}
        <div className="bg-[#D71920] px-4 py-2.5 flex items-center justify-between text-white mt-auto">
          <span className="text-xs font-bold uppercase tracking-wider font-koho">Tổng tiền</span>
          <span className="text-base font-black font-koho">
            {(
              outboundTotal +
              (data.isRoundTrip && data.returnLeg
                ? (data.returnLeg.total ?? (data.returnLeg.fare ?? 0) + (data.returnLeg.tax ?? 0))
                : 0)
            ).toLocaleString('vi-VN')}{' '}
            VND
          </span>
        </div>
      </aside>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--border)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        {mobileExpanded && (
          <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--border)] text-xs space-y-2 animate-fadeIn">
            <div className="flex justify-between font-bold text-[var(--foreground)]">
              <span>Hành trình:</span>
              <span>
                {origin} → {destination}
              </span>
            </div>
            <div className="flex justify-between text-[var(--foreground-muted)]">
              <span>Giá vé cơ bản:</span>
              <span>{(data.fare ?? 0).toLocaleString('vi-VN')} VND</span>
            </div>
            <div className="flex justify-between text-[var(--foreground-muted)]">
              <span>Thuế & phí:</span>
              <span>{(data.tax ?? 0).toLocaleString('vi-VN')} VND</span>
            </div>
            {totalServices > 0 && (
              <div className="flex justify-between text-[var(--foreground-muted)]">
                <span>Dịch vụ bổ sung:</span>
                <span>{totalServices.toLocaleString('vi-VN')} VND</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex-1 cursor-pointer" onClick={() => setMobileExpanded((prev) => !prev)}>
            <div className="flex items-center gap-1 text-xs2 text-[var(--foreground-subtle)] font-medium">
              <span>Tổng thanh toán</span>
              {mobileExpanded ? <RiArrowDownSLine size={16} /> : <RiArrowUpSLine size={16} />}
            </div>
            <div className="text-lg font-black text-[var(--primary)]">
              {data.total.toLocaleString('vi-VN')} VND
            </div>
          </div>
          <div className="w-[140px]">
            <ContinueButton onClick={onContinue} disabled={!canContinue} label="Đi tiếp" />
          </div>
        </div>
      </div>

      {/* Chi tiết hành khách modal matching Screenshot 2 */}
      <PassengerDetailModal
        isOpen={showPassengerDetailModal}
        onClose={() => setShowPassengerDetailModal(false)}
        outboundTrip={`${origin} ✈ ${destination}`}
        inboundTrip={`${destination} ✈ ${origin}`}
        outboundFare={data.fare ?? 1220400}
        inboundFare={data.returnLeg?.fare ?? 961200}
        outboundBaggageFee={data.baggageFee || 216000}
        inboundBaggageFee={data.baggageFee || 216000}
      />
    </>
  );
}
