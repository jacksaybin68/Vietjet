/**
 * API thu thập hàng loạt nhiều chặng bay cùng lúc từ vietjetair.com.
 *
 * POST /api/quan-tri/thu-thap-hang-loat
 * Body:
 *   routes: Array<{ from: string; to: string }>   — danh sách chặng
 *   dates:  string[]                               — danh sách ngày YYYY-MM-DD
 *   wafCookie?: string                             — cookie WAF tuỳ chọn
 *   importOnSuccess?: boolean                      — tự nhập vào DB nếu thu được
 *   concurrency?: number                           — tối đa N request song song (mặc định 4)
 *
 * Trả về kết quả từng cặp (chặng × ngày), kể cả thất bại — dùng
 * Promise.allSettled để một chặng WAF-403 không huỷ cả batch.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  collectVietjetSchedule,
  importWebFlights,
  type Fetcher,
  type WebFlight,
} from '@/lib/openclaw/web-collection';

export interface BulkCollectItem {
  from: string;
  to: string;
  date: string;
  route: string;
  status: 'success' | 'waf_blocked' | 'error' | 'empty';
  flights: WebFlight[];
  imported?: string[];
  skipped?: string[];
  reason?: string;
}

export interface BulkCollectResponse {
  total: number;
  succeeded: number;
  blocked: number;
  failed: number;
  imported: number;
  results: BulkCollectItem[];
}

/** Chia mảng thành từng nhóm kích thước `size`. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const body = await req.json();
    const {
      routes,
      dates,
      wafCookie,
      importOnSuccess = false,
      concurrency = 4,
      discountVnd,
    } = body || {};

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!Array.isArray(routes) || routes.length === 0) {
      return NextResponse.json({ error: 'Thiếu danh sách chặng bay (routes).' }, { status: 400 });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Thiếu danh sách ngày (dates).' }, { status: 400 });
    }

    // Giới hạn an toàn: tối đa 20 chặng × 7 ngày = 140 tổ hợp / request
    const MAX_COMBOS = 140;
    const pairs: Array<{ from: string; to: string; date: string }> = [];
    for (const r of routes) {
      const from = String(r.from ?? '')
        .trim()
        .toUpperCase();
      const to = String(r.to ?? '')
        .trim()
        .toUpperCase();
      if (!from || !to || from === to) continue;
      for (const d of dates) {
        const date = String(d ?? '').trim();
        if (!date) continue;
        pairs.push({ from, to, date });
        if (pairs.length >= MAX_COMBOS) break;
      }
      if (pairs.length >= MAX_COMBOS) break;
    }

    if (pairs.length === 0) {
      return NextResponse.json(
        { error: 'Không có tổ hợp chặng/ngày hợp lệ nào.' },
        { status: 400 }
      );
    }

    // ── Custom fetcher kèm WAF cookie nếu có ─────────────────────────────────
    let activeWafToken =
      (typeof wafCookie === 'string' && wafCookie.trim()) || process.env.VIETJET_WAF_COOKIE?.trim();

    if (!activeWafToken) {
      try {
        const { getCachedWafToken } = await import('@/lib/openclaw/waf-solver');
        const cached = await getCachedWafToken();
        if (cached) activeWafToken = cached;
      } catch {
        /* ignore */
      }
    }

    const buildFetcher =
      (cookieValue?: string): Fetcher =>
      async (url, init) => {
        const headers: Record<string, string> = { ...(init?.headers ?? {}) };
        if (cookieValue) {
          headers.Cookie = cookieValue.startsWith('aws-waf-token=')
            ? cookieValue
            : `aws-waf-token=${cookieValue}`;
        }
        return fetch(url, { ...init, headers });
      };

    let customFetcher = buildFetcher(activeWafToken);

    // ── Thu thập song song theo từng nhóm concurrency ─────────────────────────
    const safeConc = Math.min(Math.max(Number(concurrency) || 4, 1), 10);
    const results: BulkCollectItem[] = [];

    for (const group of chunk(pairs, safeConc)) {
      const settled = await Promise.allSettled(
        group.map(async ({ from, to, date }) => {
          let scheduleResult = await collectVietjetSchedule(from, to, date, customFetcher);

          if (
            process.env.NODE_ENV !== 'test' &&
            !scheduleResult.reachable &&
            scheduleResult.reason?.includes('403')
          ) {
            try {
              const { getOrRefreshWafToken } = await import('@/lib/openclaw/waf-solver');
              const freshToken = await getOrRefreshWafToken(true);
              if (freshToken) {
                customFetcher = buildFetcher(freshToken);
                scheduleResult = await collectVietjetSchedule(from, to, date, customFetcher);
              }
            } catch {
              /* ignore */
            }
          }

          const item: BulkCollectItem = {
            from,
            to,
            date,
            route: `${from}-${to}`,
            status: 'success',
            flights: [],
          };

          if (!scheduleResult.reachable) {
            item.status = scheduleResult.reason?.includes('403') ? 'waf_blocked' : 'error';
            item.reason = scheduleResult.reason;
            return item;
          }

          item.flights = scheduleResult.flights ?? [];
          if (item.flights.length === 0) {
            item.status = 'empty';
            return item;
          }

          if (importOnSuccess) {
            const importResult = await importWebFlights(
              { from, to },
              date,
              item.flights,
              typeof discountVnd === 'number' ? discountVnd : undefined
            );
            item.imported = importResult.imported;
            item.skipped = importResult.skipped;
          }

          return item;
        })
      );

      for (const result of settled) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Trường hợp exception bất ngờ (lỗi mạng, timeout...)
          results.push({
            from: '',
            to: '',
            date: '',
            route: 'unknown',
            status: 'error',
            flights: [],
            reason: result.reason instanceof Error ? result.reason.message : 'Lỗi không xác định',
          });
        }
      }
    }

    // ── Tổng hợp kết quả ─────────────────────────────────────────────────────
    const summary: BulkCollectResponse = {
      total: results.length,
      succeeded: results.filter((r) => r.status === 'success').length,
      blocked: results.filter((r) => r.status === 'waf_blocked').length,
      failed: results.filter((r) => r.status === 'error').length,
      imported: results.reduce((s, r) => s + (r.imported?.length ?? 0), 0),
      results,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error('Bulk collect error:', err);
    return NextResponse.json(
      {
        error: 'Lỗi máy chủ khi thu thập hàng loạt',
        message: err instanceof Error ? err.message : 'Lỗi không xác định',
      },
      { status: 500 }
    );
  }
}
