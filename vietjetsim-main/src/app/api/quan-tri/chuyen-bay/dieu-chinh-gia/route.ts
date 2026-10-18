import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { sql } from '@/lib/neon';
import {
  DEFAULT_VIETJET_DISCOUNT_VND,
  MIN_TICKET_PRICE_FLOOR,
  FARE_LADDER_RATIO,
} from '@/lib/openclaw/web-collection';

export type PriceAdjustAction =
  | 'discount_fixed'
  | 'increase_fixed'
  | 'discount_percent'
  | 'increase_percent'
  | 'set_fixed';

export interface BulkPriceAdjustFilter {
  from_code?: string;
  to_code?: string;
  from_date?: string;
  to_date?: string;
  flight_no?: string;
  class?: 'all' | 'economy' | 'business';
}

export interface BulkPriceAdjustPayload {
  filter?: BulkPriceAdjustFilter;
  action: PriceAdjustAction;
  amount: number;
  dryRun?: boolean;
}

export function computeAdjustedPrices(
  currentEco: number,
  currentBiz: number,
  currentClass: string,
  action: PriceAdjustAction,
  amount: number
): { newEco: number; newBiz: number; newPrice: number } {
  let newEco = currentEco;

  switch (action) {
    case 'discount_fixed':
      newEco = Math.max(MIN_TICKET_PRICE_FLOOR, Math.round(currentEco - amount));
      break;
    case 'increase_fixed':
      newEco = Math.round(currentEco + amount);
      break;
    case 'discount_percent':
      newEco = Math.max(
        MIN_TICKET_PRICE_FLOOR,
        Math.round(currentEco * (1.0 - Math.min(amount, 90) / 100.0))
      );
      break;
    case 'increase_percent':
      newEco = Math.round(currentEco * (1.0 + amount / 100.0));
      break;
    case 'set_fixed':
      newEco = Math.max(MIN_TICKET_PRICE_FLOOR, Math.round(amount));
      break;
  }

  const newBiz = Math.round(newEco * FARE_LADDER_RATIO);
  const newPrice = currentClass === 'business' ? newBiz : newEco;

  return { newEco, newBiz, newPrice };
}

export async function POST(req: NextRequest) {
  try {
    const { error, response, payload } = await verifyAdminRequest(req, 'flight:price_edit');
    if (error) return response;

    const body = (await req.json()) as BulkPriceAdjustPayload;
    const { filter = {}, action = 'discount_fixed', amount, dryRun = false } = body || {};

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Vui lòng cung cấp số tiền hoặc tỷ lệ điều chỉnh hợp lệ (amount > 0).',
        },
        { status: 400 }
      );
    }

    const fromCode =
      filter.from_code && filter.from_code !== 'all' ? filter.from_code.toUpperCase().trim() : null;
    const toCode =
      filter.to_code && filter.to_code !== 'all' ? filter.to_code.toUpperCase().trim() : null;
    const fromDate = filter.from_date ? filter.from_date.trim() : null;
    const toDate = filter.to_date ? filter.to_date.trim() : null;
    const flightNo = filter.flight_no ? filter.flight_no.toUpperCase().trim() : null;
    const seatClass = filter.class && filter.class !== 'all' ? filter.class : null;

    // Lấy các chuyến bay thoả mãn điều kiện
    const matchingRows = (await sql`
      SELECT 
        id, flight_no, from_code, to_code,
        TO_CHAR(depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') as depart_vn,
        price, economy_price, business_price, class
      FROM flights
      WHERE 
        (${fromCode}::text IS NULL OR from_code = ${fromCode})
        AND (${toCode}::text IS NULL OR to_code = ${toCode})
        AND (${flightNo}::text IS NULL OR flight_no ILIKE ${'%' + (flightNo ?? '') + '%'})
        AND (${seatClass}::text IS NULL OR class = ${seatClass})
        AND (${fromDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ${fromDate}::date)
        AND (${toDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= ${toDate}::date)
      ORDER BY depart_time ASC
    `) as Array<{
      id: string;
      flight_no: string;
      from_code: string;
      to_code: string;
      depart_vn: string;
      price: string | number;
      economy_price: string | number;
      business_price: string | number;
      class: string;
    }>;

    const totalMatched = matchingRows.length;

    // Chuẩn bị danh sách xem trước (lấy tối đa 10 chuyến mẫu)
    const previewSamples = matchingRows.slice(0, 10).map((r) => {
      const curEco = Number(r.economy_price || r.price);
      const curBiz = Number(r.business_price || Math.round(curEco * FARE_LADDER_RATIO));
      const curPrice = Number(r.price);
      const adjusted = computeAdjustedPrices(curEco, curBiz, r.class, action, amount);

      return {
        id: r.id,
        flight_no: r.flight_no,
        route: `${r.from_code} → ${r.to_code}`,
        depart_time: r.depart_vn,
        class: r.class,
        old_economy_price: curEco,
        new_economy_price: adjusted.newEco,
        old_business_price: curBiz,
        new_business_price: adjusted.newBiz,
        old_price: curPrice,
        new_price: adjusted.newPrice,
        diff: adjusted.newPrice - curPrice,
      };
    });

    // Nếu là Dry Run -> trả kết quả xem trước ngay
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        matchedCount: totalMatched,
        action,
        amount,
        samples: previewSamples,
        defaultDiscount: DEFAULT_VIETJET_DISCOUNT_VND,
      });
    }

    if (totalMatched === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        message: 'Không tìm thấy chuyến bay nào khớp với bộ lọc đã chọn.',
      });
    }

    // Thực hiện Cập nhật hàng loạt (Execute Update)
    // Tối ưu cập nhật theo công thức SQL trực tiếp
    let updateResult: Array<{ count: string | number }>;

    if (action === 'discount_fixed') {
      updateResult = (await sql`
        WITH updated AS (
          UPDATE flights
          SET 
            economy_price = GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price - ${amount})),
            business_price = GREATEST(${Math.round(MIN_TICKET_PRICE_FLOOR * FARE_LADDER_RATIO)}, ROUND(GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price - ${amount})) * ${FARE_LADDER_RATIO})),
            price = CASE 
              WHEN class = 'business' THEN GREATEST(${Math.round(MIN_TICKET_PRICE_FLOOR * FARE_LADDER_RATIO)}, ROUND(GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price - ${amount})) * ${FARE_LADDER_RATIO}))
              ELSE GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price - ${amount}))
            END,
            updated_at = NOW()
          WHERE 
            (${fromCode}::text IS NULL OR from_code = ${fromCode})
            AND (${toCode}::text IS NULL OR to_code = ${toCode})
            AND (${flightNo}::text IS NULL OR flight_no ILIKE ${'%' + (flightNo ?? '') + '%'})
            AND (${seatClass}::text IS NULL OR class = ${seatClass})
            AND (${fromDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ${fromDate}::date)
            AND (${toDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= ${toDate}::date)
          RETURNING 1
        )
        SELECT COUNT(*)::int as count FROM updated
      `) as Array<{ count: string | number }>;
    } else if (action === 'increase_fixed') {
      updateResult = (await sql`
        WITH updated AS (
          UPDATE flights
          SET 
            economy_price = ROUND(economy_price + ${amount}),
            business_price = ROUND(ROUND(economy_price + ${amount}) * ${FARE_LADDER_RATIO}),
            price = CASE 
              WHEN class = 'business' THEN ROUND(ROUND(economy_price + ${amount}) * ${FARE_LADDER_RATIO})
              ELSE ROUND(economy_price + ${amount})
            END,
            updated_at = NOW()
          WHERE 
            (${fromCode}::text IS NULL OR from_code = ${fromCode})
            AND (${toCode}::text IS NULL OR to_code = ${toCode})
            AND (${flightNo}::text IS NULL OR flight_no ILIKE ${'%' + (flightNo ?? '') + '%'})
            AND (${seatClass}::text IS NULL OR class = ${seatClass})
            AND (${fromDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ${fromDate}::date)
            AND (${toDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= ${toDate}::date)
          RETURNING 1
        )
        SELECT COUNT(*)::int as count FROM updated
      `) as Array<{ count: string | number }>;
    } else if (action === 'discount_percent') {
      const multiplier = Math.max(0.1, (100 - amount) / 100);
      updateResult = (await sql`
        WITH updated AS (
          UPDATE flights
          SET 
            economy_price = GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price * ${multiplier})),
            business_price = GREATEST(${Math.round(MIN_TICKET_PRICE_FLOOR * FARE_LADDER_RATIO)}, ROUND(GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price * ${multiplier})) * ${FARE_LADDER_RATIO})),
            price = CASE 
              WHEN class = 'business' THEN GREATEST(${Math.round(MIN_TICKET_PRICE_FLOOR * FARE_LADDER_RATIO)}, ROUND(GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price * ${multiplier})) * ${FARE_LADDER_RATIO}))
              ELSE GREATEST(${MIN_TICKET_PRICE_FLOOR}, ROUND(economy_price * ${multiplier}))
            END,
            updated_at = NOW()
          WHERE 
            (${fromCode}::text IS NULL OR from_code = ${fromCode})
            AND (${toCode}::text IS NULL OR to_code = ${toCode})
            AND (${flightNo}::text IS NULL OR flight_no ILIKE ${'%' + (flightNo ?? '') + '%'})
            AND (${seatClass}::text IS NULL OR class = ${seatClass})
            AND (${fromDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ${fromDate}::date)
            AND (${toDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= ${toDate}::date)
          RETURNING 1
        )
        SELECT COUNT(*)::int as count FROM updated
      `) as Array<{ count: string | number }>;
    } else if (action === 'increase_percent') {
      const multiplier = (100 + amount) / 100;
      updateResult = (await sql`
        WITH updated AS (
          UPDATE flights
          SET 
            economy_price = ROUND(economy_price * ${multiplier}),
            business_price = ROUND(ROUND(economy_price * ${multiplier}) * ${FARE_LADDER_RATIO}),
            price = CASE 
              WHEN class = 'business' THEN ROUND(ROUND(economy_price * ${multiplier}) * ${FARE_LADDER_RATIO})
              ELSE ROUND(economy_price * ${multiplier})
            END,
            updated_at = NOW()
          WHERE 
            (${fromCode}::text IS NULL OR from_code = ${fromCode})
            AND (${toCode}::text IS NULL OR to_code = ${toCode})
            AND (${flightNo}::text IS NULL OR flight_no ILIKE ${'%' + (flightNo ?? '') + '%'})
            AND (${seatClass}::text IS NULL OR class = ${seatClass})
            AND (${fromDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ${fromDate}::date)
            AND (${toDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= ${toDate}::date)
          RETURNING 1
        )
        SELECT COUNT(*)::int as count FROM updated
      `) as Array<{ count: string | number }>;
    } else {
      // set_fixed
      const fixedEco = Math.max(MIN_TICKET_PRICE_FLOOR, Math.round(amount));
      const fixedBiz = Math.round(fixedEco * FARE_LADDER_RATIO);
      updateResult = (await sql`
        WITH updated AS (
          UPDATE flights
          SET 
            economy_price = ${fixedEco},
            business_price = ${fixedBiz},
            price = CASE WHEN class = 'business' THEN ${fixedBiz} ELSE ${fixedEco} END,
            updated_at = NOW()
          WHERE 
            (${fromCode}::text IS NULL OR from_code = ${fromCode})
            AND (${toCode}::text IS NULL OR to_code = ${toCode})
            AND (${flightNo}::text IS NULL OR flight_no ILIKE ${'%' + (flightNo ?? '') + '%'})
            AND (${seatClass}::text IS NULL OR class = ${seatClass})
            AND (${fromDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ${fromDate}::date)
            AND (${toDate}::text IS NULL OR (depart_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= ${toDate}::date)
          RETURNING 1
        )
        SELECT COUNT(*)::int as count FROM updated
      `) as Array<{ count: string | number }>;
    }

    const updatedCount = Number(updateResult[0]?.count ?? totalMatched);

    // Ghi Audit Log quản trị
    try {
      const adminEmail = payload?.email ?? 'admin';
      const adminId = payload?.userId ?? 'admin';
      const ipAddress =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
      const userAgent = req.headers.get('user-agent') || undefined;

      await sql`
        INSERT INTO audit_logs (
          admin_email, admin_id, action, target_type, target_id,
          details_json, ip_address, user_agent, status
        )
        VALUES (
          ${adminEmail}, ${adminId}, 'flight:bulk_price_adjust', 'flights', 'multiple',
          ${JSON.stringify({
            filter,
            action,
            amount,
            updatedCount,
          })},
          ${ipAddress}, ${userAgent}, 'success'
        )
      `;
    } catch (logErr) {
      console.error('[AUDIT-LOG-ERROR] Failed to write bulk price adjust log:', logErr);
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Đã điều chỉnh giá vé thành công cho ${updatedCount.toLocaleString('vi-VN')} chuyến bay.`,
      samples: previewSamples,
    });
  } catch (err) {
    console.error('Lỗi điều chỉnh giá vé hàng loạt:', err);
    return NextResponse.json(
      {
        error: 'Lỗi máy chủ',
        message: err instanceof Error ? err.message : 'Không thể điều chỉnh giá vé hàng loạt.',
      },
      { status: 500 }
    );
  }
}
