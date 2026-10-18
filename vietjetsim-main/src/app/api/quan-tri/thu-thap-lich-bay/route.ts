import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  collectVietjetSchedule,
  importWebFlights,
  type Fetcher,
  type WebFlight,
} from '@/lib/openclaw/web-collection';

export async function POST(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const body = await req.json();
    const {
      from,
      to,
      date,
      wafCookie,
      importOnSuccess = false,
      action,
      flights,
      discountVnd,
    } = body || {};

    if (!from || !to || !date) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message:
            'Vui lòng cung cấp đầy đủ: from (nơi đi), to (nơi đến), date (ngày bay YYYY-MM-DD)',
        },
        { status: 400 }
      );
    }

    const fromCode = String(from).trim().toUpperCase();
    const toCode = String(to).trim().toUpperCase();
    const dateStr = String(date).trim();

    if (fromCode === toCode) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Sân bay đi và đến không được trùng nhau',
        },
        { status: 400 }
      );
    }

    // Trường hợp 1: Nhập danh sách chuyến đã xem trước
    if (action === 'import' && Array.isArray(flights)) {
      const importResult = await importWebFlights(
        { from: fromCode, to: toCode },
        dateStr,
        flights as WebFlight[],
        typeof discountVnd === 'number' ? discountVnd : undefined
      );
      return NextResponse.json({
        success: true,
        reachable: true,
        route: `${fromCode}-${toCode}`,
        date: dateStr,
        ...importResult,
      });
    }

    // Trường hợp 2: Thu thập từ vietjet-api
    let activeWafToken =
      (typeof wafCookie === 'string' && wafCookie.trim()) || process.env.VIETJET_WAF_COOKIE?.trim();

    // Nếu chưa có, thử lấy từ DB cache
    if (!activeWafToken) {
      const { getCachedWafToken } = await import('@/lib/openclaw/waf-solver');
      const cached = await getCachedWafToken();
      if (cached) activeWafToken = cached;
    }

    const buildFetcher =
      (cookieValue?: string): Fetcher =>
      async (url, init) => {
        const headers: Record<string, string> = { ...(init?.headers || {}) };
        if (cookieValue) {
          headers.Cookie = cookieValue.startsWith('aws-waf-token=')
            ? cookieValue
            : `aws-waf-token=${cookieValue}`;
        }
        return fetch(url, { ...init, headers });
      };

    let scheduleResult = await collectVietjetSchedule(
      fromCode,
      toCode,
      dateStr,
      buildFetcher(activeWafToken)
    );

    // Nếu bị 403 và chưa có token hoặc token cũ bị hết hạn, tự động kích hoạt Chrome để giải WAF (chỉ khi không trong test environment)
    if (
      process.env.NODE_ENV !== 'test' &&
      !scheduleResult.reachable &&
      scheduleResult.reason?.includes('403')
    ) {
      try {
        const { getOrRefreshWafToken } = await import('@/lib/openclaw/waf-solver');
        const freshToken = await getOrRefreshWafToken(true);
        if (freshToken) {
          scheduleResult = await collectVietjetSchedule(
            fromCode,
            toCode,
            dateStr,
            buildFetcher(freshToken)
          );
        }
      } catch (solverErr) {
        console.error('Tự động giải WAF thất bại:', solverErr);
      }
    }

    if (!scheduleResult.reachable) {
      return NextResponse.json({
        ...scheduleResult,
        hint: 'CloudFront/WAF chặn HTTP 403. Vui lòng cung cấp cookie aws-waf-token hoặc sử dụng tính năng giải WAF tự động qua Chrome.',
      });
    }

    // Nếu thu thập thành công và importOnSuccess = true
    if (importOnSuccess) {
      const importResult = await importWebFlights(
        { from: fromCode, to: toCode },
        dateStr,
        scheduleResult.flights,
        typeof discountVnd === 'number' ? discountVnd : undefined
      );
      return NextResponse.json({
        ...scheduleResult,
        imported: importResult.imported,
        skipped: importResult.skipped,
      });
    }

    // Trả kết quả để xem trước
    return NextResponse.json(scheduleResult);
  } catch (err) {
    console.error('Lỗi thu thập lịch bay Vietjet:', err);
    return NextResponse.json(
      {
        error: 'Lỗi máy chủ',
        message: err instanceof Error ? err.message : 'Không kết nối được vietjetair.com',
      },
      { status: 500 }
    );
  }
}
