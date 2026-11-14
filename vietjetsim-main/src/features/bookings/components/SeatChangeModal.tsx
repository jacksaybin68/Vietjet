'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { MdSwapHoriz } from 'react-icons/md';
import { apiRequest, ApiRequestError } from '@/shared/services';
import { useToast } from '@/hooks/useToast';
import { useSeatMapSSE } from '@/hooks/useSeatMapSSE';
import { SeatMap, type Seat } from './SeatMap';
import { getSeatCharge } from '../pricing';
import type { TripLeg } from './TripCard';

interface SeatChangeModalProps {
  leg: TripLeg;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * Đổi ghế sau khi đã đặt vé.
 *
 * Giá chênh lệch do SERVER tính (`getSeatCharge(new) − getSeatCharge(old)`) —
 * client chỉ gửi ghế mới, và server trả về `price_delta` đã kiểm. Modal này
 * hiển thị phí chênh lệch để khách biết trước khi xác nhận.
 */
export default function SeatChangeModal({ leg, onClose, onChanged }: SeatChangeModalProps) {
  const toast = useToast();
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flightId = leg.flightId || null;
  const { data: liveSeatData } = useSeatMapSSE(flightId);

  const occupiedSet = useMemo(() => {
    const set = new Set<string>();
    liveSeatData?.occupied?.forEach((seat) => set.add(seat));
    liveSeatData?.locked?.forEach((lock) => set.add(lock.seatId));
    // Ghế hiện tại của chính khách vẫn chọn được (không phải ghế trống).
    for (const passenger of leg.passengers) {
      if (passenger.seat_number) set.delete(passenger.seat_number);
    }
    for (const checkIn of leg.check_ins) {
      if (checkIn.seat_number) set.delete(checkIn.seat_number);
    }
    return set;
  }, [liveSeatData, leg.passengers, leg.check_ins]);

  const seats: Seat[] = useMemo(() => {
    const list: Seat[] = [];
    const columns = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let row = 1; row <= 30; row++) {
      for (const column of columns) {
        const id = `${row}${column}`;
        list.push({
          id,
          number: id,
          row,
          column,
          class: row <= 3 ? 'business' : 'economy',
          price: getSeatCharge(id),
          isOccupied: occupiedSet.has(id),
          isSelected: selectedSeat === id,
          isExtraLegroom: row === 11 || row === 30,
          isEmergencyExit: row === 10 || row === 11,
        });
      }
    }
    return list;
  }, [occupiedSet, selectedSeat]);

  /** Ghế hiện tại của hành khách đầu tiên — dùng làm mốc tính phí chênh lệch. */
  const currentSeat = leg.passengers[0]?.seat_number || leg.check_ins[0]?.seat_number || null;

  const priceDelta = useMemo(() => {
    if (!selectedSeat) return 0;
    return getSeatCharge(selectedSeat) - (currentSeat ? getSeatCharge(currentSeat) : 0);
  }, [selectedSeat, currentSeat]);

  const handleConfirm = useCallback(async () => {
    const passenger = leg.passengers[0];
    if (!passenger || !selectedSeat) return;

    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/dat-ve/${leg.id}/ghe`, {
        method: 'PATCH',
        body: {
          passenger_id: passenger.id,
          seat_number: selectedSeat,
        },
      });
      onChanged();
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : 'Không đổi được ghế. Vui lòng thử lại.';
      setError(message);
      toast.error('Đổi ghế thất bại', message);
    } finally {
      setSaving(false);
    }
  }, [leg, selectedSeat, onChanged, toast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-vj bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary via-red-600 to-primary px-5 py-4 text-white">
          <div>
            <h3 className="font-black uppercase tracking-wide">
              Đổi chỗ ngồi · {leg.flight.flight_no}
            </h3>
            <p className="mt-0.5 text-2xs text-white/85">
              Ghế hiện tại: <strong className="text-white">{currentSeat || 'Chưa chọn'}</strong>
              {liveSeatData ? ' · Đồng bộ thời gian thực' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <p className="mb-4 text-center text-xs text-gray-600">
            Nhấp vào ghế còn trống để chọn vị trí ngồi mới.
          </p>
          <SeatMap
            seats={seats}
            selectedSeats={selectedSeat ? [selectedSeat] : []}
            onSeatToggle={(seatId) => {
              setError(null);
              setSelectedSeat(seatId);
            }}
            aircraftType="A321"
            className="rounded-vj border border-gray-200 shadow-xs"
          />
        </div>

        {error && (
          <p className="border-t border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4">
          <div className="text-xs">
            <span className="text-gray-500">Ghế mới: </span>
            <strong className="text-sm font-black text-primary">
              {selectedSeat || 'Chưa chọn'}
            </strong>
            {priceDelta !== 0 && (
              <p className="mt-0.5 text-2xs font-bold text-gray-600">
                {priceDelta > 0 ? 'Phí chênh lệch: +' : 'Hoàn: '}
                {Math.abs(priceDelta).toLocaleString('vi-VN')}₫
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-vj bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!selectedSeat || saving}
              onClick={() => void handleConfirm()}
              className="inline-flex items-center gap-1.5 rounded-vj bg-primary px-5 py-2 text-xs font-black text-white shadow-md transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              <MdSwapHoriz className="h-4 w-4" />
              {saving ? 'Đang đổi...' : 'Xác nhận đổi ghế'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
