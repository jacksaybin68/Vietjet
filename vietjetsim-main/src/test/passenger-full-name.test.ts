import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fullPassengerName } from '@/features/bookings/types/booking-flow';

/**
 * Vé in tên đầy đủ của hành khách.
 *
 * Form đặt vé tách hai ô theo giấy tờ tùy thân ("Họ" và "Tên đệm & tên"), nhưng
 * cột `passengers.name` chỉ có một chỗ, và mọi nơi đọc lại nó — vé, thẻ lên máy
 * bay, check-in, email, tên trên sơ đồ ghế — chỉ thấy phần họ. Khách nhận
 * vé in ra "Hoàng ": không phải tên trên giấy tờ, và cũng không phải tên quầy
 * check-in sẽ đối chiếu.
 */
describe('tên hành khách đầy đủ', () => {
  it('ghép họ và tên đệm thành một chuỗi tên', () => {
    expect(fullPassengerName({ name: 'Nguyễn', firstName: 'Văn An' })).toBe('Nguyễn Văn An');
  });

  it('cắt khoảng trắng thừa và bỏ phần không có', () => {
    expect(fullPassengerName({ name: '  Hoàng ', firstName: '' })).toBe('Hoàng');
    expect(fullPassengerName({ name: '', firstName: ' An ' })).toBe('An');
    expect(fullPassengerName({ name: 'Hoàng', firstName: undefined })).toBe('Hoàng');
  });

  it('form đặt vé gửi tên đầy đủ xuống server, không gửi riêng phần họ', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/bookings/components/FlightBookingClient.tsx'),
      'utf8'
    );
    expect(source).toMatch(/name:\s*fullPassengerName\(passenger\)/);
    // `passengers: booking.passengers` — bản gốc trước khi ghép tên.
    expect(source).not.toMatch(/passengers:\s*booking\.passengers\b/);
  });

  it('sơ đồ ghế hiện tên đầy đủ', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/bookings/components/SeatSelectionStep.tsx'),
      'utf8'
    );
    expect(source).toMatch(/fullPassengerName\(seatedPassengers\[i\]\)/);
  });
});
