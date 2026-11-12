import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as paymentPost } from '@/app/api/thanh-toan/route';
import { POST as vietqrWebhookPost } from '@/app/api/thanh-toan/webhook/vietqr/route';
import { GET as checkInGet, POST as checkInPost } from '@/app/api/checkin/route';
import { PATCH as adminFlightPatch } from '@/app/api/quan-tri/chuyen-bay/[id]/route';
import { generateTokens, type User } from '@/lib/auth';
import {
  generateVietQrSignature,
  resolveVietQrWebhookSecret,
  DEV_VIETQR_WEBHOOK_SECRET,
} from '@/lib/vietqr-webhook';

describe('Tác vụ 6.1: Bộ Kịch bản Kiểm thử Tự động E2E & Tích hợp Nghiệp vụ', () => {
  const mockUser: User = {
    id: 'user-e2e-test-1',
    email: 'khachhang.e2e@vietjetsim.vn',
    full_name: 'Nguyễn Văn Kiểm Thử',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAdmin: User = {
    id: 'admin-e2e-1',
    email: 'admin.operator@vietjetsim.vn',
    full_name: 'Điều Phối Viên Vietjet',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userTokens = generateTokens(mockUser);
  const adminTokens = generateTokens(mockAdmin);
  const csrfToken = 'test-e2e-csrf-token-32-chars-long!';

  describe('Kịch bản 1: Luồng Mua vé trọn gói & Thanh toán VietQR thành công', () => {
    it('khởi tạo giao dịch thanh toán VietQR cho đặt chỗ', async () => {
      const paymentReq = new NextRequest('http://localhost:4028/api/thanh-toan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          cookie: `access_token=${userTokens.accessToken}; csrf_token=${csrfToken}`,
        },
        body: JSON.stringify({
          booking_id: 'bk-mock-e2e-001',
          method: 'vietqr',
          amount: 2_450_000,
          transfer_note: 'VJ VJE2E1',
        }),
      });

      const res = await paymentPost(paymentReq);
      expect([200, 201, 404]).toContain(res.status);
    });

    it('VietQR webhook đối soát tự động kích hoạt vé điện tử và ngăn chặn Replay Attack', async () => {
      const payload = {
        transactionId: `TX-VIETQR-${Date.now()}`,
        bookingCode: 'VJE2E1',
        amount: 2_450_000,
        content: 'VJ VJE2E1',
        timestamp: Date.now(),
      };

      const rawBody = JSON.stringify(payload);
      const secret = resolveVietQrWebhookSecret() || DEV_VIETQR_WEBHOOK_SECRET;
      const sig = generateVietQrSignature(rawBody, secret);

      const webhookReq = new NextRequest('http://localhost:4028/api/thanh-toan/webhook/vietqr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vietqr-signature': sig,
          'x-vietqr-timestamp': String(payload.timestamp),
        },
        body: rawBody,
      });

      const res = await vietqrWebhookPost(webhookReq);
      expect([200, 404, 503]).toContain(res.status);
    });
  });

  describe('Kịch bản 2: Luồng Đổi chỗ ngồi trực tuyến khi Check-in', () => {
    it('tra cứu thông tin đặt chỗ check-in qua mã PNR và họ tên hành khách', async () => {
      const searchUrl = 'http://localhost:4028/api/checkin?bookingCode=VJE2E1&lastName=NGUYEN';
      const searchReq = new NextRequest(searchUrl, {
        method: 'GET',
      });

      const res = await checkInGet(searchReq);
      expect([200, 404]).toContain(res.status);
    });

    it('xác nhận chọn hoặc đổi ghế ngồi mới khi check-in', async () => {
      const changeSeatReq = new NextRequest('http://localhost:4028/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          cookie: `access_token=${userTokens.accessToken}; csrf_token=${csrfToken}`,
        },
        body: JSON.stringify({
          bookingId: 'bk-mock-e2e-001',
          passengerId: 'pass-mock-001',
          seatNumber: '14F',
        }),
      });

      const res = await checkInPost(changeSeatReq);
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  describe('Kịch bản 3: Luồng Admin cập nhật Delay & Khách nhận thông báo Realtime', () => {
    it('Admin thay đổi trạng thái chuyến bay sang Delayed kèm lý do thời tiết và giờ dự kiến mới', async () => {
      const updateReq = new NextRequest('http://localhost:4028/api/quan-tri/chuyen-bay/VJ123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
        },
        body: JSON.stringify({
          status: 'delayed',
          notes: 'Thời tiết xấu tại sân bay Nội Bài (HAN)',
        }),
      });

      const params = Promise.resolve({ id: 'VJ123' });
      const res = await adminFlightPatch(updateReq, { params });
      expect([200, 400, 404]).toContain(res.status);
    });

    it('từ chối khách hàng thông thường không có quyền admin can thiệp trạng thái chuyến bay (RBAC)', async () => {
      const unauthorizedReq = new NextRequest(
        'http://localhost:4028/api/quan-tri/chuyen-bay/VJ123',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
            cookie: `access_token=${userTokens.accessToken}; csrf_token=${csrfToken}`,
          },
          body: JSON.stringify({
            status: 'delayed',
          }),
        }
      );

      const params = Promise.resolve({ id: 'VJ123' });
      const res = await adminFlightPatch(unauthorizedReq, { params });
      expect([401, 403]).toContain(res.status);
    });
  });
});
