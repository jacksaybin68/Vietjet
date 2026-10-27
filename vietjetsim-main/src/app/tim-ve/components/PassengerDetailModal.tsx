'use client';

import React, { useState } from 'react';
import { RiCloseLine, RiEditLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri';

export interface PassengerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  passengerName?: string;
  outboundTrip?: string;
  inboundTrip?: string;
  outboundFare?: number;
  inboundFare?: number;
  outboundBaggage?: string;
  inboundBaggage?: string;
  outboundBaggageFee?: number;
  inboundBaggageFee?: number;
  outboundDate?: string;
  inboundDate?: string;
  outboundFlightNo?: string;
  inboundFlightNo?: string;
  isRoundTrip?: boolean;
  outboundTax?: number;
  inboundTax?: number;
}

export default function PassengerDetailModal({
  isOpen,
  onClose,
  passengerName = 'LONG NGUYEN',
  outboundTrip = 'Hà Nội (HAN) ✈ Tp. Hồ Chí Minh (SGN)',
  inboundTrip = 'Tp. Hồ Chí Minh (SGN) ✈ Hà Nội (HAN)',
  outboundFare = 1220400,
  inboundFare = 549720,
  outboundTax = 581581,
  inboundTax = 581581,
  outboundBaggage = 'Gói 20kg',
  inboundBaggage = 'Gói 20kg',
  outboundBaggageFee = 0,
  inboundBaggageFee = 0,
  outboundDate = 'T6, 30/10/2026 | 05:00 - 07:10',
  inboundDate = 'T3, 17/11/2026 | 05:00 - 07:10',
  outboundFlightNo = 'VJ141',
  inboundFlightNo = 'VJ134',
  isRoundTrip = true,
}: PassengerDetailModalProps) {
  const [openOutFare, setOpenOutFare] = useState(false);
  const [openOutTax, setOpenOutTax] = useState(false);
  const [openOutService, setOpenOutService] = useState(false);

  const [openInFare, setOpenInFare] = useState(false);
  const [openInTax, setOpenInTax] = useState(false);
  const [openInService, setOpenInService] = useState(false);

  if (!isOpen) return null;

  const outTax = outboundTax;
  const outTotal = outboundFare + outTax + outboundBaggageFee;

  const inTax = inboundTax;
  const inTotal = inboundFare + inTax + inboundBaggageFee;

  const grandTotal = outTotal + (isRoundTrip ? inTotal : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card matching Screenshot 7 */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Header - Red bar with Vietjet curve top-right (Screenshot 7) */}
        <div className="relative bg-[#C4161C] text-white px-4 py-3.5 flex items-center justify-between shadow-md overflow-hidden">
          <div className="w-8 shrink-0" />
          <h2 className="font-sans font-black italic tracking-wide text-base sm:text-lg uppercase text-white text-center flex-1">
            THÔNG TIN ĐẶT CHỖ
          </h2>
          <div className="relative z-10">
            <button
              onClick={onClose}
              className="text-gray-900 bg-white/90 hover:bg-white p-1 rounded-full transition-colors flex items-center justify-center h-7 w-7 cursor-pointer"
              aria-label="Đóng"
            >
              <RiCloseLine size={20} />
            </button>
          </div>
          {/* Vietjet green-yellow swoosh on top right */}
          <div className="pointer-events-none absolute top-0 right-0 h-14 w-24 overflow-hidden">
            <svg
              className="absolute -top-4 -right-4 h-20 w-28 opacity-95"
              viewBox="0 0 100 60"
              fill="none"
            >
              <path d="M100 0 L 20 0 C 40 30, 70 50, 100 60 Z" fill="#2E7D32" />
              <path d="M100 0 L 45 0 C 60 25, 80 45, 100 50 Z" fill="#FBB612" />
            </svg>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* Box 1: Thông tin hành khách */}
          <div className="rounded-lg bg-gray-100 p-3 text-xs font-bold text-gray-800">
            Thông tin hành khách: <span className="uppercase text-gray-900">{passengerName}</span>
          </div>

          {/* Box 2: Chuyến đi */}
          <div className="rounded-xl border border-blue-100 overflow-hidden shadow-2xs bg-white">
            <div className="bg-[#DFF0FE] px-3.5 py-2.5 flex items-center justify-between font-bold text-xs">
              <span className="text-gray-900 font-extrabold">Chuyến đi</span>
              <div className="flex items-center gap-1.5 text-red-600 font-black">
                <span>{outTotal.toLocaleString('vi-VN')} VND</span>
                <RiEditLine size={15} className="text-red-600" />
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="font-bold text-gray-900 text-xs">{outboundTrip}</div>
              <div className="text-2xs text-gray-500 font-medium">
                {outboundDate} | {outboundFlightNo} | Eco
              </div>

              {/* Accordions */}
              <div className="space-y-1.5 pt-1">
                {/* Giá vé */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => setOpenOutFare(!openOutFare)}
                    className="p-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 hover:bg-gray-100"
                  >
                    <span>Giá vé</span>
                    <div className="flex items-center gap-1">
                      <span>{outboundFare.toLocaleString('vi-VN')} VND</span>
                      {openOutFare ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                    </div>
                  </div>
                  {openOutFare && (
                    <div className="p-2.5 pt-0 text-2xs text-gray-600 border-t border-gray-100 space-y-1">
                      <div className="flex justify-between">
                        <span>Giá cước cơ bản:</span>
                        <span>{Math.round(outboundFare / 1.08).toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Thuế VAT:</span>
                        <span>
                          {(outboundFare - Math.round(outboundFare / 1.08)).toLocaleString('vi-VN')}{' '}
                          VND
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Thuế, phí */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => setOpenOutTax(!openOutTax)}
                    className="p-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 hover:bg-gray-100"
                  >
                    <span>Thuế, phí</span>
                    <div className="flex items-center gap-1">
                      <span>{outTax.toLocaleString('vi-VN')} VND</span>
                      {openOutTax ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                    </div>
                  </div>
                  {openOutTax && (
                    <div className="p-2.5 pt-0 text-2xs text-gray-600 border-t border-gray-100 space-y-1">
                      <div className="flex justify-between">
                        <span>Phí an ninh soi chiếu:</span>
                        <span>18.181 VND</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phí sân bay quốc nội:</span>
                        <span>99.000 VND</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phí quản trị hệ thống:</span>
                        <span>215.000 VND</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DGM management fee:</span>
                        <span>215.000 VND</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dịch vụ */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                  <div
                    onClick={() => setOpenOutService(!openOutService)}
                    className="p-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 hover:bg-gray-100"
                  >
                    <span>Dịch vụ</span>
                    <div className="flex items-center gap-1">
                      <span>{outboundBaggageFee.toLocaleString('vi-VN')} VND</span>
                      {openOutService ? (
                        <RiArrowUpSLine size={16} />
                      ) : (
                        <RiArrowDownSLine size={16} />
                      )}
                    </div>
                  </div>
                  {openOutService && (
                    <div className="p-2.5 pt-0 text-2xs text-gray-600 border-t border-gray-100">
                      <div className="flex justify-between">
                        <span>Hành lý ({outboundBaggage}):</span>
                        <span>{outboundBaggageFee.toLocaleString('vi-VN')} VND</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Chuyến về (if roundtrip) */}
          {isRoundTrip && (
            <div className="rounded-xl border border-blue-100 overflow-hidden shadow-2xs bg-white">
              <div className="bg-[#DFF0FE] px-3.5 py-2.5 flex items-center justify-between font-bold text-xs">
                <span className="text-gray-900 font-extrabold">Chuyến về</span>
                <div className="flex items-center gap-1.5 text-red-600 font-black">
                  <span>{inTotal.toLocaleString('vi-VN')} VND</span>
                  <RiEditLine size={15} className="text-red-600" />
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="font-bold text-gray-900 text-xs">{inboundTrip}</div>
                <div className="text-2xs text-gray-500 font-medium">
                  {inboundDate} | {inboundFlightNo} | Eco
                </div>

                {/* Accordions */}
                <div className="space-y-1.5 pt-1">
                  {/* Giá vé */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                    <div
                      onClick={() => setOpenInFare(!openInFare)}
                      className="p-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 hover:bg-gray-100"
                    >
                      <span>Giá vé</span>
                      <div className="flex items-center gap-1">
                        <span>{inboundFare.toLocaleString('vi-VN')} VND</span>
                        {openInFare ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                      </div>
                    </div>
                    {openInFare && (
                      <div className="p-2.5 pt-0 text-2xs text-gray-600 border-t border-gray-100 space-y-1">
                        <div className="flex justify-between">
                          <span>Giá cước cơ bản:</span>
                          <span>{Math.round(inboundFare / 1.08).toLocaleString('vi-VN')} VND</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT:</span>
                          <span>
                            {(inboundFare - Math.round(inboundFare / 1.08)).toLocaleString('vi-VN')}{' '}
                            VND
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thuế, phí */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                    <div
                      onClick={() => setOpenInTax(!openInTax)}
                      className="p-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 hover:bg-gray-100"
                    >
                      <span>Thuế, phí</span>
                      <div className="flex items-center gap-1">
                        <span>{inTax.toLocaleString('vi-VN')} VND</span>
                        {openInTax ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
                      </div>
                    </div>
                    {openInTax && (
                      <div className="p-2.5 pt-0 text-2xs text-gray-600 border-t border-gray-100 space-y-1">
                        <div className="flex justify-between">
                          <span>Phí an ninh soi chiếu:</span>
                          <span>18.181 VND</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phí sân bay quốc nội:</span>
                          <span>99.000 VND</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phí quản trị hệ thống:</span>
                          <span>215.000 VND</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dịch vụ */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
                    <div
                      onClick={() => setOpenInService(!openInService)}
                      className="p-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 hover:bg-gray-100"
                    >
                      <span>Dịch vụ</span>
                      <div className="flex items-center gap-1">
                        <span>{inboundBaggageFee.toLocaleString('vi-VN')} VND</span>
                        {openInService ? (
                          <RiArrowUpSLine size={16} />
                        ) : (
                          <RiArrowDownSLine size={16} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Red Bottom Bar (Screenshot 7) */}
        <div className="bg-[#C4161C] text-white px-5 py-3.5 flex items-center justify-between font-bold text-sm shadow-lg">
          <span className="font-bold text-white text-sm">Tổng tiền</span>
          <span className="font-black text-white text-base">
            {grandTotal.toLocaleString('vi-VN')} VND
          </span>
        </div>
      </div>
    </div>
  );
}
