import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getActiveAnnouncements = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ getActiveAnnouncements }));

import { GET } from '@/app/api/cong-khai/thong-bao/route';

const get = () => GET(new NextRequest('http://localhost/api/cong-khai/thong-bao'));

describe('GET /api/cong-khai/thong-bao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveAnnouncements.mockResolvedValue([]);
  });

  it('trả các thông báo đang hiệu lực cho khách chưa đăng nhập', async () => {
    getActiveAnnouncements.mockResolvedValue([
      {
        id: 'a1',
        title: 'Bảo trì hệ thống',
        content: 'Hệ thống tạm ngưng từ 22h đến 23h ngày 20/10.',
        type: 'system',
      },
    ]);

    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      announcements: [
        {
          id: 'a1',
          title: 'Bảo trì hệ thống',
          content: 'Hệ thống tạm ngưng từ 22h đến 23h ngày 20/10.',
          type: 'system',
        },
      ],
    });
  });

  // The bar renders on every page, so a database hiccup must not turn the
  // homepage into a 500 — the component keeps its fallback line instead.
  it('vẫn trả 200 với danh sách rỗng khi truy vấn lỗi', async () => {
    getActiveAnnouncements.mockRejectedValue(new Error('db down'));

    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ announcements: [] });
  });
});
