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
  };
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
  const [showTaxDetail, setShowTaxDetail] = useState(true);
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
      <aside className="hidden lg:flex lg:w-[360px] flex-col rounded-xl overflow-hidden shadow-sm border border-[var(--border)] bg-white h-fit sticky top-20">
        {/* Panel header — brand red, with a yellow secondary action. */}
        <div className="bg-[var(--primary)] px-4 py-3 text-white flex items-center justify-between shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wider font-koho">
            THÔNG TIN ĐẶT CHỖ
          </h2>
          <button
            type="button"
            onClick={() => setShowPassengerDetailModal(true)}
            className="text-2xs bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-black font-black px-2.5 py-1 rounded transition-colors"
          >
            Chi Tiết
          </button>
        </div>

        {/* Bar: Thông tin hành khách */}
        <div className="bg-[var(--surface-2)] px-4 py-2 border-b border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--foreground)]">
          <span>Thông tin hành khách</span>
          <RiArrowDownSLine size={16} className="text-[var(--foreground-subtle)]" />
        </div>

        {/* Section: Chuyến đi */}
        <div className="border-b border-[var(--border)]">
          <div className="bg-[var(--surface-2)] px-4 py-2.5 flex items-center justify-between border-b border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase">
              Chuyến đi
            </span>
            <div className="flex items-center gap-1.5 text-xs font-black text-[var(--primary)]">
              <span>{outboundTotal.toLocaleString('vi-VN')} VND</span>
              <RiEditLine size={14} className="cursor-pointer hover:opacity-75" />
            </div>
          </div>

          <div className="p-3.5 space-y-2.5 bg-white">
            <div className="text-xs font-black text-[var(--foreground)] leading-tight">
              {origin} <span className="text-[var(--primary)]">✈</span> {destination}
            </div>
            <div className="text-xs2 text-[var(--foreground-subtle)]">
              {data.date} | {data.flightNo ?? 'VJ120'} | {data.fareClass ?? 'Eco'}
            </div>

            {/* Price breakdown rows */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-[var(--border)]">
              <div
                className="flex items-center justify-between cursor-pointer hover:text-[var(--foreground)] text-[var(--foreground-muted)]"
                onClick={() => setShowFareDetail(!showFareDetail)}
              >
                <span>Giá vé</span>
                <div className="flex items-center gap-1 font-bold">
                  <span>{(data.fare ?? 0).toLocaleString('vi-VN')} VND</span>
                  {showFareDetail ? <RiArrowUpSLine size={14} /> : <RiArrowDownSLine size={14} />}
                </div>
              </div>

              <div>
                <div
                  className="flex items-center justify-between cursor-pointer hover:text-[var(--foreground)] text-[var(--foreground-muted)]"
                  onClick={() => setShowTaxDetail(!showTaxDetail)}
                >
                  <span>Thuế, phí</span>
                  <div className="flex items-center gap-1 font-bold">
                    <span>{(data.tax ?? 0).toLocaleString('vi-VN')} VND</span>
                    {showTaxDetail ? <RiArrowUpSLine size={14} /> : <RiArrowDownSLine size={14} />}
                  </div>
                </div>

                {showTaxDetail && (
                  <div className="pl-3 pr-1 py-1.5 space-y-1 text-xs2 text-gray-500 border-l-2 border-red-200 ml-1 mt-1 bg-gray-50/70 rounded-r">
                    <div className="flex justify-between">
                      <span>Phí an ninh soi chiếu</span>
                      <span>{feeSecurity.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Domestic airport tax</span>
                      <span>{feeAirport.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phí quản trị hệ thống</span>
                      <span>{feeSystemAdmin.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DGM management fee</span>
                      <span>{feeDgm.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuế VAT</span>
                      <span>{feeVat.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="flex items-center justify-between cursor-pointer hover:text-[var(--foreground)] text-[var(--foreground-muted)]"
                onClick={() => setShowServiceDetail(!showServiceDetail)}
              >
                <span>Dịch vụ</span>
                <div className="flex items-center gap-1 font-bold">
                  <span>{totalServices.toLocaleString('vi-VN')} VND</span>
                  {showServiceDetail ? (
                    <RiArrowUpSLine size={14} />
                  ) : (
                    <RiArrowDownSLine size={14} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Chuyến về (if roundtrip) */}
        {data.isRoundTrip && (
          <div className="border-b border-[var(--border)]">
            <div className="bg-[var(--surface-2)] px-4 py-2.5 flex items-center justify-between border-b border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase">
                Chuyến về
              </span>
              <div className="flex items-center gap-1.5 text-xs font-black text-[var(--primary)]">
                <span>
                  {data.returnLeg?.total
                    ? `${data.returnLeg.total.toLocaleString('vi-VN')} VND`
                    : '0 VND'}
                </span>
                <RiEditLine size={14} className="cursor-pointer hover:opacity-75" />
              </div>
            </div>
            <div className="p-3.5 space-y-2 bg-white text-xs">
              <div className="font-black text-[var(--foreground)]">
                {destination} <span className="text-[var(--primary)]">✈</span> {origin}
              </div>
              <div className="text-xs2 text-[var(--foreground-subtle)]">
                {data.returnLeg?.flightNo
                  ? `${data.returnLeg.date ?? data.date} | ${data.returnLeg.flightNo} | ${data.returnLeg.fareClass ?? 'Eco'}`
                  : '--:-- | --:-- | ---'}
              </div>

              <div className="space-y-1 text-xs pt-1 border-t border-gray-100 text-gray-700">
                <div className="flex justify-between">
                  <span>Giá vé</span>
                  <span>
                    {data.returnLeg?.fare
                      ? `${data.returnLeg.fare.toLocaleString('vi-VN')} VND`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Thuế, phí</span>
                  <span>
                    {data.returnLeg?.tax
                      ? `${data.returnLeg.tax.toLocaleString('vi-VN')} VND`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dịch vụ</span>
                  <span>0 VND</span>
                </div>
              </div>
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

        {/* Total footer */}
        <div className="bg-[var(--primary)] text-white p-3.5 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider">Tổng tiền</span>
          <span className="text-xl font-black font-koho text-white">
            {data.total.toLocaleString('vi-VN')} VND
          </span>
        </div>

        {/* Continue Button */}
        <div className="p-3 bg-white border-t border-[var(--border)]">
          <ContinueButton onClick={onContinue} disabled={!canContinue} label="Đi tiếp" />
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
