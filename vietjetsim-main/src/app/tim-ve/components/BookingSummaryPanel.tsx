'use client';

import React, { useState } from 'react';
import ContinueButton from './ContinueButton';
import { RiEditLine, RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import PassengerDetailModal from './PassengerDetailModal';

const SummaryPlaneIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="text-primary inline-block mx-1 align-middle"
    aria-hidden="true"
  >
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

import { PassengerType } from '@/features/bookings/types/booking-flow';

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
  paxCounts?: Record<PassengerType, number>;
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
  const [showPaxDetail, setShowPaxDetail] = useState(true);
  const [showFareDetail, setShowFareDetail] = useState(true);
  const [showReturnFareDetail, setShowReturnFareDetail] = useState(false);
  const [showTaxDetail, setShowTaxDetail] = useState(false);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [showPassengerDetailModal, setShowPassengerDetailModal] = useState(false);

  const tripParts = (data.trip || '').split('→').map((s) => s.trim());
  const origin = tripParts[0] || 'Tp. Hồ Chí Minh (SGN)';
  const destination = tripParts[1] || 'Hà Nội (HAN)';

  const adultCount = data.paxCounts?.adult ?? 1;
  const childCount = data.paxCounts?.child ?? 0;
  const infantCount = data.paxCounts?.infant ?? 0;
  const totalPaxCount = adultCount + childCount + infantCount;

  const paxRatio = adultCount + childCount * 0.75;
  const singleAdultFare = paxRatio > 0 ? Math.round((data.fare ?? 0) / paxRatio) : (data.fare ?? 0);
  const singleChildFare = Math.round(singleAdultFare * 0.75);

  const returnSingleAdultFare =
    data.returnLeg?.fare && paxRatio > 0
      ? Math.round(data.returnLeg.fare / paxRatio)
      : (data.returnLeg?.fare ?? 0);
  const returnSingleChildFare = Math.round(returnSingleAdultFare * 0.75);

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
      {/* Desktop Panel — số đo site thật (13/11/2026): rộng `380px`, header
          gradient đỏ `359.2deg` cao `56px` với `h3` 20px/700 trắng, các thanh
          mục cao `52px` nền `#F1F1F1` tiêu đề `18px/600`, thanh tổng nền trắng
          "Tổng tiền" `20px/600` + giá `22px/700`, nút "Đi tiếp" `127×39`. */}
      <aside className="hidden lg:flex lg:w-[380px] lg:flex-none flex-col rounded-vj-panel overflow-hidden shadow-sm border border-gray-200 bg-white h-fit sticky top-4">
        {/* Panel header — gradient đỏ 359.2deg, cao 56px */}
        <div className="vj-summary-head px-4 flex items-center justify-center">
          <h3 className="font-koho text-2xl3 font-bold uppercase text-white tracking-normal">
            THÔNG TIN ĐẶT CHỖ
          </h3>
        </div>

        {/* Bar: Thông tin hành khách */}
        <div className="border-b border-gray-200/80">
          <div
            className="vj-summary-bar px-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowPaxDetail(!showPaxDetail)}
          >
            <span className="font-koho text-lg font-semibold text-vj-text">
              Thông tin hành khách
            </span>
            <div className="flex items-center gap-1 font-bold text-vj-text font-koho text-sm">
              <span>{totalPaxCount} khách</span>
              {showPaxDetail ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
            </div>
          </div>
          {showPaxDetail && (
            <div className="px-4 py-2 space-y-1 text-xs2 text-gray-600 bg-[var(--vj-bar-gray)] border-t border-[var(--vj-bar-gray)]">
              <div className="flex justify-between">
                <span>Người lớn</span>
                <span className="font-bold text-gray-900">{adultCount}</span>
              </div>
              {childCount > 0 && (
                <div className="flex justify-between">
                  <span>Trẻ em (2 - 11 tuổi)</span>
                  <span className="font-bold text-gray-900">{childCount}</span>
                </div>
              )}
              {infantCount > 0 && (
                <div className="flex justify-between">
                  <span>Em bé (&lt; 2 tuổi)</span>
                  <span className="font-bold text-gray-900">{infantCount}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Chuyến đi — nền #F1F1F1, chữ #333333 (quy ước 1 bảng màu) */}
        <div className="border-b border-gray-200/80">
          <div className="vj-summary-bar px-4 flex items-center justify-between text-lg font-semibold text-vj-text">
            <span>Chuyến đi</span>
            {data.flightNo && (
              <div className="flex items-center gap-1 text-primary font-bold font-koho text-lg tracking-normal normal-case">
                <span>{outboundTotal.toLocaleString('vi-VN')} VND</span>
                <RiEditLine size={14} className="stroke-[1]" />
              </div>
            )}
          </div>

          <div className="p-3 space-y-1 bg-white">
            {/* Tuyến 16px/700; ngày/số hiệu 14px/500 (đo 13/11/2026) */}
            <div className="text-base font-bold text-vj-text leading-tight flex items-center">
              <span>{origin}</span>
              <SummaryPlaneIcon />
              <span>{destination}</span>
            </div>
            <div className="text-sm font-medium text-gray-600 flex items-center flex-wrap gap-1">
              <span>
                {data.flightNo
                  ? `${formatViSummaryDate(data.date)} | ${data.departTime || '04:40'} - ${data.arriveTime || '06:50'} | ${data.flightNo} | `
                  : '--- | --- | --- | '}
              </span>
              {data.flightNo ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-vj-fare-bg text-vj-text border border-gray-200">
                  {formatFareClassName(data.fareClass)}
                </span>
              ) : (
                <span>---</span>
              )}
            </div>
          </div>
        </div>

        {/* Bar: Giá vé */}
        <div className="border-b border-gray-200/80">
          <div
            className="vj-summary-bar px-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowFareDetail(!showFareDetail)}
          >
            <span className="font-koho text-lg font-semibold text-vj-text">Giá vé</span>
            {data.fare && data.fare > 0 ? (
              <div className="flex items-center gap-1 font-bold text-primary font-koho text-lg">
                <span>{data.fare.toLocaleString('vi-VN')} VND</span>
                {showFareDetail ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
              </div>
            ) : null}
          </div>

          {showFareDetail && data.fare && data.fare > 0 && (
            <div className="px-4 py-2 space-y-1 text-xs2 text-gray-500 bg-[var(--vj-bar-gray)] border-t border-[var(--vj-bar-gray)]">
              <div className="flex justify-between">
                <span>Người lớn x {adultCount}</span>
                <span>{(singleAdultFare * adultCount).toLocaleString('vi-VN')} VND</span>
              </div>
              {childCount > 0 && (
                <div className="flex justify-between">
                  <span>Trẻ em x {childCount} (75%)</span>
                  <span>{(singleChildFare * childCount).toLocaleString('vi-VN')} VND</span>
                </div>
              )}
              {infantCount > 0 && (
                <div className="flex justify-between">
                  <span>Em bé x {infantCount} (Miễn phí)</span>
                  <span>0 VND</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bar: Thuế, phí */}
        <div className="border-b border-gray-200/80">
          <div
            className="vj-summary-bar px-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowTaxDetail(!showTaxDetail)}
          >
            <span className="font-koho text-lg font-semibold text-vj-text">Thuế, phí</span>
            <div className="flex items-center gap-1 font-bold text-primary font-koho text-lg">
              {data.tax && data.tax > 0 ? (
                <span>{data.tax.toLocaleString('vi-VN')} VND</span>
              ) : (
                <span>581.581 VND</span>
              )}
              <RiArrowDownSLine size={16} />
            </div>
          </div>

          {showTaxDetail && (
            <div className="px-4 py-2 space-y-1 text-xs2 text-gray-500 bg-[var(--vj-bar-gray)] border-t border-[var(--vj-bar-gray)]">
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
          className="vj-summary-bar px-4 border-b border-gray-200/80 flex items-center justify-between cursor-pointer"
          onClick={() => setShowServiceDetail(!showServiceDetail)}
        >
          <span className="font-koho text-lg font-semibold text-vj-text">Dịch vụ</span>
          <div className="flex items-center gap-1 font-bold text-primary font-koho text-lg">
            <span>{totalServices.toLocaleString('vi-VN')} VND</span>
            <RiArrowDownSLine size={16} />
          </div>
        </div>

        {/* Section: Chuyến về (always present for roundtrip matching screenshot) */}
        {(data.isRoundTrip || data.returnLeg !== undefined) && (
          <div className="border-b border-gray-200/80">
            <div className="vj-summary-bar px-4 flex items-center justify-between text-lg font-semibold text-vj-text">
              <span>Chuyến về</span>
              {data.returnLeg?.flightNo && (
                <div className="flex items-center gap-1 text-primary font-bold font-koho text-lg tracking-normal normal-case">
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
              <div className="text-base font-bold text-vj-text leading-tight flex items-center">
                <span>{destination}</span>
                <SummaryPlaneIcon />
                <span>{origin}</span>
              </div>
              <div className="text-sm font-medium text-gray-600 flex items-center flex-wrap gap-1">
                <span>
                  {data.returnLeg?.flightNo
                    ? `${formatViSummaryDate(data.returnLeg.date ?? data.date)} | ${data.returnLeg.departTime || '---'} - ${data.returnLeg.arriveTime || '---'} | ${data.returnLeg.flightNo} | `
                    : '--- | --- | --- | '}
                </span>
                {data.returnLeg?.flightNo ? (
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-vj-fare-bg text-vj-text border border-gray-200">
                    {formatFareClassName(data.returnLeg.fareClass)}
                  </span>
                ) : (
                  <span>---</span>
                )}
              </div>
            </div>

            {/* Bar: Giá vé (Chuyến về) */}
            <div className="border-b border-gray-200/80">
              <div
                className="vj-summary-bar px-4 flex items-center justify-between cursor-pointer"
                onClick={() => setShowReturnFareDetail(!showReturnFareDetail)}
              >
                <span className="font-koho text-lg font-semibold text-vj-text">Giá vé</span>
                {data.returnLeg?.fare && data.returnLeg.fare > 0 ? (
                  <div className="flex items-center gap-1 font-bold text-primary font-koho text-lg">
                    <span>{data.returnLeg.fare.toLocaleString('vi-VN')} VND</span>
                    {showReturnFareDetail ? (
                      <RiArrowUpSLine size={16} />
                    ) : (
                      <RiArrowDownSLine size={16} />
                    )}
                  </div>
                ) : null}
              </div>

              {showReturnFareDetail && data.returnLeg?.fare && data.returnLeg.fare > 0 && (
                <div className="px-4 py-2 space-y-1 text-xs2 text-gray-500 bg-[var(--vj-bar-gray)] border-t border-[var(--vj-bar-gray)]">
                  <div className="flex justify-between">
                    <span>Người lớn x {adultCount}</span>
                    <span>{(returnSingleAdultFare * adultCount).toLocaleString('vi-VN')} VND</span>
                  </div>
                  {childCount > 0 && (
                    <div className="flex justify-between">
                      <span>Trẻ em x {childCount} (75%)</span>
                      <span>
                        {(returnSingleChildFare * childCount).toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                  )}
                  {infantCount > 0 && (
                    <div className="flex justify-between">
                      <span>Em bé x {infantCount} (Miễn phí)</span>
                      <span>0 VND</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bar: Thuế, phí (Chuyến về) */}
            <div className="vj-summary-bar px-4 flex items-center justify-between">
              <span className="font-koho text-lg font-semibold text-vj-text">Thuế, phí</span>
              {data.returnLeg?.tax && data.returnLeg.tax > 0 ? (
                <div className="flex items-center gap-1 font-bold text-primary font-koho text-lg">
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

        {/* Thanh tổng — site thật (đo 14/11/2026): nền gradient đỏ
            `359.2deg` (`#D91A21 53.08% → #6F0000 206.46%`), cao `50px`,
            padding `15px 20px`, "Tổng tiền" `20px/600` trắng, giá `22px/700`
            JambonoMedium trắng. */}
        <div className="vj-summary-total mt-auto flex items-center justify-between">
          <span className="font-koho text-2xl3 font-semibold text-white">Tổng tiền</span>
          <span className="font-jambono text-xl4 font-bold text-white">
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

      {/* Mobile Sticky Bottom Bar - hidden to avoid collision with wrapper floating button */}
      <div className="hidden">
        {mobileExpanded && (
          <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--border)] text-xs space-y-2 animate-fadeIn">
            <div className="flex justify-between font-bold text-[var(--foreground)]">
              <span>Hành trình:</span>
              <span>
                {origin} → {destination}
              </span>
            </div>
            <div className="flex justify-between text-[var(--foreground-muted)]">
              <span>Hành khách:</span>
              <span>
                {adultCount} Người lớn
                {childCount > 0 ? `, ${childCount} Trẻ em` : ''}
                {infantCount > 0 ? `, ${infantCount} Em bé` : ''}
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
