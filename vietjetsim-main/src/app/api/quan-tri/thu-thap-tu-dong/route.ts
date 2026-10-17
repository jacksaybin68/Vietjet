/**
 * API Quản lý & Kích hoạt Tự Động Đồng Bộ (Auto-Sync)
 *
 * GET  /api/quan-tri/thu-thap-tu-dong : Lấy cấu hình tự động hiện tại & báo cáo
 * POST /api/quan-tri/thu-thap-tu-dong : Cập nhật cấu hình hoặc kích hoạt chạy ngay (action: 'run_now')
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  getAutoSyncConfig,
  saveAutoSyncConfig,
  runAutoSync,
  type AutoSyncConfig,
} from '@/lib/openclaw/collect-scheduler';

export async function GET(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const config = await getAutoSyncConfig();
    return NextResponse.json({ success: true, config });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Lỗi tải cấu hình tự động đồng bộ',
        message: err instanceof Error ? err.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const body = await req.json();
    const { action, config, force = false } = body || {};

    if (action === 'run_now') {
      const report = await runAutoSync(force);
      return NextResponse.json({ success: true, report });
    }

    if (config && typeof config === 'object') {
      const updated = await saveAutoSyncConfig(config as Partial<AutoSyncConfig>);
      return NextResponse.json({ success: true, config: updated });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Lỗi xử lý yêu cầu tự động đồng bộ',
        message: err instanceof Error ? err.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
