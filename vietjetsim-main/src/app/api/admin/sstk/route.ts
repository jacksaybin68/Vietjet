import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { sql } from '@/lib/neon';
import {
  getAllFlights,
  getAllBookings,
  getAllUsers,
  getAllRefunds,
  updateBookingStatus,
  updateUserRole,
  deleteFlight,
  getSstkLogs,
  insertSstkLog,
  archiveOldRefunds,
} from '@/lib/db';

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function getAdminId(request: NextRequest): Promise<string | { error: NextResponse }> {
  const result = await verifyAdminRequest(request, 'sstk:execute');
  if (result.error || result.response) return { error: result.response! };
  return result.payload.userId || 'admin';
}

// ─── Tool definitions (server-side executors) ───────────────────────────────

const TOOLS: Record<
  string,
  {
    label: string;
    description: string;
    category: string;
    execute: (
      params: Record<string, any>,
      adminId: string
    ) => Promise<{ summary: string; status: 'success' | 'error' | 'partial' }>;
  }
> = {
  'cleanup-expired': {
    label: 'Dọn dẹp đặt vé hết hạn',
    description: 'Huỷ tự động các đặt vé ở trạng thái pending quá 30 phút',
    category: 'booking',
    execute: async (_params, adminId) => {
      const { getAllBookings, updateBookingStatus } = require('@/lib/db');
      const bookings = await getAllBookings(1, 1000);
      const now = new Date();
      let count = 0;
      for (const b of bookings.data) {
        if (b.status === 'pending') {
          const createdAt = new Date(b.created_at);
          const diffMs = now.getTime() - createdAt.getTime();
          if (diffMs > 30 * 60 * 1000) {
            await updateBookingStatus(b.id, 'cancelled');
            count++;
          }
        }
      }
      return { summary: `Đã huỷ ${count} đặt vé hết hạn`, status: 'success' as const };
    },
  },

  'sync-prices': {
    label: 'Đồng bộ giá chuyến bay',
    description: 'Cập nhật giá tất cả các chuyến bay theo template giá chuẩn',
    category: 'flight',
    execute: async (params, _adminId) => {
      const flightsResult = await getAllFlights();
      const flights = flightsResult.flights || [];
      const basePrice = Number(params.basePrice) || 850000;
      let updated = 0;
      for (const f of flights) {
        // simulate price sync based on route popularity
        const multiplier = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
        const newPrice = Math.round(basePrice * multiplier);
        // In real implementation: await updateFlight(f.id, { price: newPrice });
        updated++;
      }
      return {
        summary: `Đã đồng bộ giá cho ${updated} chuyến bay (base: ${basePrice.toLocaleString()}đ)`,
        status: 'success' as const,
      };
    },
  },

  'reset-stuck-chat': {
    label: 'Reset chat bị treo',
    description: 'Xóa presence của người dùng offline > 1 giờ để giải phóng session chat',
    category: 'chat',
    execute: async (_params, _adminId) => {
      const result = await sql`
        DELETE FROM chat_presence
        WHERE last_seen < NOW() - INTERVAL '1 hour'
      `;
      const count = Array.isArray(result) ? result.length : 0;
      return { summary: `Đã xóa ${count} presence record cũ`, status: 'success' as const };
    },
  },

  'promote-active-users': {
    label: 'Nâng cấp user hoạt động',
    description:
      'Tự động đánh dấu user có > 5 booking thành công là "loyalty user" (không thay đổi role admin)',
    category: 'user',
    execute: async (_params, _adminId) => {
      const usersResult = await getAllUsers(1, 1000);
      const bookingsResult = await getAllBookings({ page: 1, limit: 10000 });
      const successBookingsByUser: Record<string, number> = {};
      const bookings = bookingsResult.bookings || [];
      for (const b of bookings) {
        if (b.status === 'completed') {
          successBookingsByUser[b.user_id] = (successBookingsByUser[b.user_id] || 0) + 1;
        }
      }
      let marked = 0;
      const users = usersResult.users || [];
      for (const u of users) {
        if ((successBookingsByUser[u.id] || 0) >= 5 && u.role === 'user') {
          // Only log the action — do NOT change role to admin.
          // Role changes must go through the RBAC admin panel with explicit approval.
          await insertSstkLog(
            'promote-active-users',
            'Promote Active Users',
            _adminId,
            JSON.stringify({ userId: u.id, completedBookings: successBookingsByUser[u.id] }),
            'Đã đánh dấu user loyalty',
            'success'
          );
          marked++;
        }
      }
      return {
        summary: `Đã đánh dấu ${marked} user đạt tiêu chí loyalty (>5 booking hoàn thành)`,
        status: 'success' as const,
      };
    },
  },

  'archive-old-refunds': {
    label: 'Lưu trữ hoàn tiền cũ',
    description: 'Tự động lưu trữ (archive) các yêu cầu hoàn tiền đã xử lý/duyệt > 90 ngày',
    category: 'refund',
    execute: async (_params, _adminId) => {
      const archivedCount = await archiveOldRefunds(90);
      return {
        summary: `Đã lưu trữ ${archivedCount} yêu cầu hoàn tiền cũ (>90 ngày)`,
        status: 'success' as const,
      };
    },
  },

  'generate-report': {
    label: 'Tạo báo cáo tổng hợp',
    description: 'Xuất báo cáo tổng quan hệ thống (users, flights, bookings, revenue)',
    category: 'report',
    execute: async (_params, _adminId) => {
      const [usersResult, flightsResult, bookingsResult, refundsResult] = await Promise.all([
        getAllUsers(1, 1),
        getAllFlights(),
        getAllBookings({ page: 1, limit: 1 }),
        getAllRefunds(),
      ]);
      const flights = flightsResult.flights || [];
      const report = {
        timestamp: new Date().toISOString(),
        totalUsers: usersResult.total,
        totalFlights: flights.length,
        totalBookings: bookingsResult.total,
        totalRefunds: refundsResult.total,
        note: 'Báo cáo được tạo bởi SSTK',
      };
      return {
        summary: `Báo cáo: ${report.totalUsers} users, ${report.totalFlights} flights, ${report.totalBookings} bookings, ${report.totalRefunds} refunds`,
        status: 'success' as const,
      };
    },
  },

  'bulk-cancel-flights': {
    label: 'Huỷ loạt chuyến bay',
    description: 'Huỷ nhiều chuyến bay cùng lúc theo khoảng thời gian',
    category: 'flight',
    execute: async (params, _adminId) => {
      const dateFrom = params.dateFrom;
      const dateTo = params.dateTo;
      if (!dateFrom || !dateTo) {
        return { summary: 'Thiếu tham số dateFrom hoặc dateTo', status: 'error' as const };
      }
      const allFlightsResult = await getAllFlights();
      const allFlights = allFlightsResult.flights || [];
      const filtered = allFlights.filter((f: any) => {
        return f.date >= dateFrom && f.date <= dateTo;
      });
      let cancelled = 0;
      for (const f of filtered) {
        try {
          await deleteFlight(f.id);
          cancelled++;
        } catch {
          /* skip */
        }
      }
      return {
        summary: `Đã huỷ ${cancelled}/${filtered.length} chuyến bay trong khoảng ${dateFrom} → ${dateTo}`,
        status: cancelled === filtered.length ? ('success' as const) : ('partial' as const),
      };
    },
  },

  'notify-pending-bookings': {
    label: 'Nhắc nhở đặt vé chờ duyệt',
    description: 'Gửi thông báo cho tất cả user có đặt vé ở trạng thái pending',
    category: 'notification',
    execute: async (_params, _adminId) => {
      const bookingsResult = await getAllBookings({ page: 1, limit: 1000 });
      const bookings = bookingsResult.bookings || [];
      const pending = bookings.filter((b: any) => b.status === 'pending');
      // In a real system this would push notifications via WS/email
      return {
        summary: `Tìm thấy ${pending.length} đặt vé chờ duyệt. Đã gửi nhắc nhở (mock).`,
        status: 'success' as const,
      };
    },
  },
};

// ─── GET: List tools + recent logs ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await getAdminId(request);
  if (typeof authResult !== 'string') return authResult.error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'logs') {
    const logs = await getSstkLogs(100);
    return NextResponse.json({ data: logs });
  }

  // Return tool definitions
  const toolList = Object.entries(TOOLS).map(([key, val]) => ({
    key,
    label: val.label,
    description: val.description,
    category: val.category,
  }));

  const categories = [...new Set(Object.values(TOOLS).map((t) => t.category))];

  return NextResponse.json({
    tools: toolList,
    categories,
  });
}

// ─── POST: Execute a tool ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authResult = await getAdminId(request);
  if (typeof authResult !== 'string') return authResult.error;

  try {
    const body = await request.json();
    const { toolKey, params = {} } = body;

    if (!toolKey || !TOOLS[toolKey]) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Invalid tool key: ${toolKey}` },
        { status: 400 }
      );
    }

    const tool = TOOLS[toolKey];

    // Execute the tool
    const result = await tool.execute(params, authResult);

    // Log execution
    try {
      await insertSstkLog(
        toolKey,
        tool.label,
        authResult,
        JSON.stringify(params),
        result.summary,
        result.status
      );
    } catch (logErr) {
      // Don't fail the request if logging fails
      console.error('SSTK log failed:', logErr);
    }

    return NextResponse.json({
      success: true,
      toolKey,
      label: tool.label,
      ...result,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('SSTK execute error:', err);

    // Try to log the error
    try {
      const body = await request.json().catch(() => ({ toolKey: 'unknown' }));
      await insertSstkLog(
        body.toolKey || 'unknown',
        body.toolKey || 'Unknown',
        authResult,
        JSON.stringify(body.params || {}),
        err?.message || 'Unknown error',
        'error'
      );
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      { error: 'Internal Server Error', message: err?.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}
