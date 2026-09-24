'use client';

export interface Seat {
  id: string;
  number: string;
  row: number;
  column: string;
  class: 'economy' | 'business' | 'first';
  price: number;
  isOccupied: boolean;
  isSelected: boolean;
  isExtraLegroom: boolean;
  isEmergencyExit: boolean;
}

interface SeatMapProps {
  seats: Seat[];
  selectedSeats: string[];
  onSeatToggle: (seatId: string) => void;
  flightClass?: 'economy' | 'business' | 'first';
  aircraftType?: 'A320' | 'B737' | 'A321';
  className?: string;
}

const COLUMN_CONFIG = {
  A320: ['A', 'B', 'C', 'D', 'E', 'F'],
  B737: ['A', 'B', 'C', 'D', 'E', 'F'],
  A321: ['A', 'B', 'C', 'D', 'E', 'F'],
};

const ROWS_CONFIG = {
  A320: 30,
  B737: 32,
  A321: 35,
};

export function SeatMap({
  seats,
  selectedSeats,
  onSeatToggle,
  aircraftType = 'A320',
  className = '',
}: SeatMapProps) {
  const columns = COLUMN_CONFIG[aircraftType];
  const totalRows = ROWS_CONFIG[aircraftType];

  // Group seats by row
  const seatsByRow = seats.reduce(
    (acc, seat) => {
      if (!acc[seat.row]) {
        acc[seat.row] = [];
      }
      acc[seat.row].push(seat);
      return acc;
    },
    {} as Record<number, Seat[]>
  );

  // Extra legroom rows (typically row 11 and last row)
  const extraLegroomRows = [11, totalRows];

  // Emergency exit rows
  const emergencyExitRows = [10, 11];

  const getSeatColor = (seat: Seat) => {
    if (seat.isOccupied) {
      return 'bg-gray-300cursor-not-allowed';
    }
    if (selectedSeats.includes(seat.id) || seat.isSelected) {
      return 'bg-blue-500 text-white ring-2 ring-blue-300';
    }
    if (seat.isExtraLegroom || emergencyExitRows.includes(seat.row)) {
      return 'bg-amber-100/50 hover:bg-amber-200:bg-amber-800 text-amber-800';
    }
    if (seat.class === 'business') {
      return 'bg-purple-100/50 hover:bg-purple-200:bg-purple-800 text-purple-800';
    }
    return 'bg-green-100/50 hover:bg-green-200:bg-green-800 text-green-800';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VND';
  };

  return (
    <div className={`bg-whiterounded-lg p-4 ${className}`}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-green-100/50" />
          <span className="text-xs text-gray-600">Phổ thông</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-purple-100/50" />
          <span className="text-xs text-gray-600">Thương gia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-100/50" />
          <span className="text-xs text-gray-600">Chỗ rộng</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500" />
          <span className="text-xs text-gray-600">Đã chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-300" />
          <span className="text-xs text-gray-600">Đã đặt</span>
        </div>
      </div>

      {/* Aircraft Layout */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Column Headers */}
          <div className="flex mb-2">
            <div className="w-8" />
            {columns.map((col, idx) => (
              <div key={col} className="flex-1 text-center text-sm font-medium text-gray-600">
                <span className={idx === 2 ? 'mr-8' : idx === 3 ? 'ml-8' : ''}>{col}</span>
              </div>
            ))}
            <div className="w-8" />
          </div>

          {/* Seat Rows */}
          {Array.from({ length: totalRows }, (_, rowIndex) => {
            const row = rowIndex + 1;
            const rowSeats = seatsByRow[row] || [];
            const isExtraLegroom = extraLegroomRows.includes(row);
            const isEmergency = emergencyExitRows.includes(row);

            return (
              <div key={row} className="flex items-center mb-1">
                {/* Row Number */}
                <div className="w-8 text-center text-xs text-gray-500">{row}</div>

                {/* Left Aisle Seats */}
                {columns.slice(0, 3).map((col) => {
                  const seat = rowSeats.find((s) => s.column === col);
                  return (
                    <div key={`${row}-${col}`} className="flex-1 px-1">
                      {seat ? (
                        <button
                          onClick={() => !seat.isOccupied && onSeatToggle(seat.id)}
                          disabled={seat.isOccupied}
                          className={`w-full aspect-[4/3] rounded flex items-center justify-center text-xs font-medium transition-all
                            ${getSeatColor(seat)}
                            ${!seat.isOccupied ? 'hover:scale-105 cursor-pointer' : ''}
                          `}
                          title={`Ghế ${seat.number} - ${formatPrice(seat.price)}${isExtraLegroom ? ' (Chỗ rộng)' : ''}`}
                        >
                          {seat.number.replace(/[A-Z]/g, '')}
                        </button>
                      ) : (
                        <div className="w-full aspect-[4/3]" />
                      )}
                    </div>
                  );
                })}

                {/* Aisle */}
                <div className="w-8 flex items-center justify-center">
                  {(isExtraLegroom || isEmergency) && (
                    <span className="text-[8px] text-amber-500font-medium">
                      {isEmergency ? 'EXIT' : 'XL'}
                    </span>
                  )}
                </div>

                {/* Right Aisle Seats */}
                {columns.slice(3).map((col) => {
                  const seat = rowSeats.find((s) => s.column === col);
                  return (
                    <div key={`${row}-${col}`} className="flex-1 px-1">
                      {seat ? (
                        <button
                          onClick={() => !seat.isOccupied && onSeatToggle(seat.id)}
                          disabled={seat.isOccupied}
                          className={`w-full aspect-[4/3] rounded flex items-center justify-center text-xs font-medium transition-all
                            ${getSeatColor(seat)}
                            ${!seat.isOccupied ? 'hover:scale-105 cursor-pointer' : ''}
                          `}
                          title={`Ghế ${seat.number} - ${formatPrice(seat.price)}${isExtraLegroom ? ' (Chỗ rộng)' : ''}`}
                        >
                          {seat.number.replace(/[A-Z]/g, '')}
                        </button>
                      ) : (
                        <div className="w-full aspect-[4/3]" />
                      )}
                    </div>
                  );
                })}

                {/* Row Number */}
                <div className="w-8 text-center text-xs text-gray-500">{row}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper function to generate seats for a flight
export function generateSeatsForFlight(
  flightId: string,
  aircraftType: 'A320' | 'B737' | 'A321' = 'A320',
  existingBookings: string[] = []
): Seat[] {
  const columns = COLUMN_CONFIG[aircraftType];
  const totalRows = ROWS_CONFIG[aircraftType];
  const seats: Seat[] = [];

  for (let row = 1; row <= totalRows; row++) {
    for (const column of columns) {
      const seatNumber = `${row}${column}`;
      seats.push({
        id: `${flightId}-${seatNumber}`,
        number: seatNumber,
        row,
        column,
        class: row <= 5 ? 'business' : 'economy',
        price: row <= 5 ? 5000000 : 1500000 + row * 20000,
        isOccupied: existingBookings.includes(seatNumber),
        isSelected: false,
        isExtraLegroom: [11, totalRows].includes(row),
        isEmergencyExit: [10, 11].includes(row),
      });
    }
  }

  return seats;
}
