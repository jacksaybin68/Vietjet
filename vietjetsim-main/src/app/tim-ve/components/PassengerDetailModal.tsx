'use client';

import React, { useState } from 'react';
import { RiCloseLine, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri';

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
}

export default function PassengerDetailModal({
  isOpen,
  onClose,
  passengerName = 'Mr LONG CHIN',
  outboundTrip = 'Tp. Hồ Chí Minh (SGN) ✈ Hà Nội (HAN)',
  inboundTrip = 'Hà Nội (HAN) ✈ Tp. Hồ Chí Minh (SGN)',
  outboundFare = 1220400,
  inboundFare = 961200,
  outboundBaggage = 'Gói 20kg',
  inboundBaggage = 'Gói 20kg',
  outboundBaggageFee = 216000,
  inboundBaggageFee = 216000,
}: PassengerDetailModalProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isOpen) return null;

  // Outbound calculations
  const outFareNet = Math.round(outboundFare / 1.08);
  const outFareVat = outboundFare - outFareNet;
  const outTax = 581581;
  const outTotal = outboundFare + outTax + outboundBaggageFee;

  // Inbound calculations
  const inFareNet = Math.round(inboundFare / 1.08);
  const inFareVat = inboundFare - inFareNet;
  const inTax = 581581;
  const inTotal = inboundFare + inTax + inboundBaggageFee;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Card matching Screenshot 2 */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col animate-scaleUp">
        {/* Header - Red bar with "Chi tiết hành khách" */}
        <div className="bg-primary-dark text-white px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black tracking-wide flex-1 text-center">
            Chi tiết hành khách
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-amber-300 p-1 rounded transition-colors ml-2"
            aria-label="Đóng"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Passenger Accordion Header */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              className="bg-gray-100 hover:bg-gray-200/80 px-4 py-2.5 flex items-center justify-between cursor-pointer font-bold text-gray-800 transition-colors"
            >
              <span>Người lớn: {passengerName}</span>
              {isExpanded ? <RiArrowUpSLine size={18} /> : <RiArrowDownSLine size={18} />}
            </div>

            {isExpanded && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {/* Chặng đi */}
                <div className="space-y-3 pb-3 md:pb-0">
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{outboundTrip}</h4>
                    <span className="text-xs2 text-gray-500 mt-0.5 block">
                      Hành lý ký gửi: {outboundBaggage}
                    </span>
                  </div>

                  <div className="text-xs2 font-bold text-success border-b border-gray-100 pb-1">
                    Chi tiết
                  </div>

                  <div className="space-y-2 text-xs2 text-gray-600">
                    <div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Giá vé</span>
                        <span>{outboundFare.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pl-3 pt-0.5 space-y-0.5 text-gray-500 text-2xs">
                        <div className="flex justify-between">
                          <span>Eco</span>
                          <span>{outFareNet.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT</span>
                          <span>{outFareVat.toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Thuế, phí</span>
                        <span>{outTax.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pl-3 pt-0.5 space-y-0.5 text-gray-500 text-2xs">
                        <div className="flex justify-between">
                          <span>Phí an ninh soi chiếu</span>
                          <span>18.181</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domestic airport tax</span>
                          <span>99.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phí quản trị hệ thống</span>
                          <span>215.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DGM management fee</span>
                          <span>215.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT</span>
                          <span>34.400</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Dịch vụ</span>
                        <span>{outboundBaggageFee.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pl-3 pt-0.5 space-y-0.5 text-gray-500 text-2xs">
                        <div className="flex justify-between">
                          <span>Chọn thêm hành lý</span>
                          <span>{(outboundBaggageFee - 16000).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT</span>
                          <span>16.000</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-gray-800">
                      <span>Khác</span>
                      <span>0 VND</span>
                    </div>

                    <div className="flex justify-between font-black text-primary-dark pt-2 border-t border-gray-200 text-xs">
                      <span>Tổng tiền</span>
                      <span>{outTotal.toLocaleString('vi-VN')} VND</span>
                    </div>
                  </div>
                </div>

                {/* Chặng về */}
                <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{inboundTrip}</h4>
                    <span className="text-xs2 text-gray-500 mt-0.5 block">
                      Hành lý ký gửi: {inboundBaggage}
                    </span>
                  </div>

                  <div className="text-xs2 font-bold text-success border-b border-gray-100 pb-1">
                    Chi tiết
                  </div>

                  <div className="space-y-2 text-xs2 text-gray-600">
                    <div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Giá vé</span>
                        <span>{inboundFare.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pl-3 pt-0.5 space-y-0.5 text-gray-500 text-2xs">
                        <div className="flex justify-between">
                          <span>Eco</span>
                          <span>{inFareNet.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT</span>
                          <span>{inFareVat.toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Thuế, phí</span>
                        <span>{inTax.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pl-3 pt-0.5 space-y-0.5 text-gray-500 text-2xs">
                        <div className="flex justify-between">
                          <span>Phí an ninh soi chiếu</span>
                          <span>18.181</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Domestic airport tax</span>
                          <span>99.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phí quản trị hệ thống</span>
                          <span>215.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>DGM management fee</span>
                          <span>215.000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT</span>
                          <span>34.400</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Dịch vụ</span>
                        <span>{inboundBaggageFee.toLocaleString('vi-VN')} VND</span>
                      </div>
                      <div className="pl-3 pt-0.5 space-y-0.5 text-gray-500 text-2xs">
                        <div className="flex justify-between">
                          <span>Chọn thêm hành lý</span>
                          <span>{(inboundBaggageFee - 16000).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế VAT</span>
                          <span>16.000</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between font-bold text-gray-800">
                      <span>Khác</span>
                      <span>0 VND</span>
                    </div>

                    <div className="flex justify-between font-black text-primary-dark pt-2 border-t border-gray-200 text-xs">
                      <span>Tổng tiền</span>
                      <span>{inTotal.toLocaleString('vi-VN')} VND</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
