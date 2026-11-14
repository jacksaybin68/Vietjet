import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/admin-auth', () => ({
  verifyAdminRequest: vi.fn().mockResolvedValue({
    payload: { userId: 'admin-1', email: 'admin@vietjetair.vn', role: 'admin' },
    error: undefined,
    response: undefined,
  }),
}));

vi.mock('@/lib/db', () => ({
  getAllUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
  updateUserRole: vi.fn(),
  findUserById: vi.fn().mockResolvedValue({
    id: 'user-1',
    email: 'customer@example.com',
    role: 'user',
  }),
  // Mirrors `deleteUser`'s refusal shape from `src/lib/db.ts`.
  deleteUser: vi.fn().mockRejectedValue(
    Object.assign(new Error('Không thể xóa người dùng: còn 2 đặt vé liên kết.'), {
      code: 'USER_HAS_BOOKINGS',
      status: 409,
    })
  ),
  getAllFlights: vi.fn().mockResolvedValue({ flights: [], total: 0 }),
  createFlight: vi.fn(),
  updateFlight: vi.fn(),
  deleteFlight: vi.fn().mockRejectedValue(
    Object.assign(new Error('Không thể xóa chuyến bay: còn 3 đặt vé liên kết.'), {
      code: 'FLIGHT_HAS_BOOKINGS',
      status: 409,
    })
  ),
}));

describe('admin delete routes keep their 409', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DELETE /api/quan-tri/nguoi-dung answers 409 with the reason, not 500', async () => {
    const { DELETE } = await import('@/app/api/quan-tri/nguoi-dung/route');

    const res = await DELETE(
      new NextRequest('http://localhost:4028/api/quan-tri/nguoi-dung?userId=user-1', {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('Conflict');
    expect(data.message).toContain('đặt vé liên kết');
  });

  it('DELETE /api/quan-tri/chuyen-bay answers 409 with the reason, not 500', async () => {
    const { DELETE } = await import('@/app/api/quan-tri/chuyen-bay/route');

    const res = await DELETE(
      new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay?flight_id=flight-1', {
        method: 'DELETE',
      })
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('Conflict');
    expect(data.message).toContain('đặt vé liên kết');
  });
});
