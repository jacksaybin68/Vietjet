import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  getAllRefunds,
  updateRefundStatus,
  refundWallet,
  setRefundVisibility,
  updateRefundDetails,
  isRefundFeatureEnabled,
  setRefundFeatureEnabled,
} from '@/lib/db';
import type { RefundRecord } from '@/lib/db';
import { parsePaginationParams, getPaginationMeta } from '@/lib/pagination';

// ─── GET: Get all refund requests (admin) ───────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { payload: _payload, error, response } = await verifyAdminRequest(request, 'refund:list');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const status = searchParams.get('status') || undefined;

    const { refunds, total } = await getAllRefunds({ page, limit, status });
    const refundFeatureEnabled = await isRefundFeatureEnabled();

    return NextResponse.json({
      refunds,
      pagination: getPaginationMeta(page, limit, total),
      refundFeatureEnabled,
    });
  } catch (error) {
    console.error('Error fetching refunds (admin):', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch refunds' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update refund status (admin) ────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { payload: admin, error, response } = await verifyAdminRequest(request, 'refund:approve');
    if (error) return response;

    const body = (await request.json()) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : 'set_status';

    // ─── Lock / unlock the whole feature ──────────────────────────────────
    if (action === 'set_feature_lock') {
      const enabled = Boolean(body.enabled);
      await setRefundFeatureEnabled(enabled, admin.userId);
      return NextResponse.json({ success: true, refundFeatureEnabled: enabled });
    }

    const refundId = typeof body.refundId === 'string' ? body.refundId : '';
    if (!refundId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'refundId is required' },
        { status: 400 }
      );
    }

    // ─── Show / hide a ticket on the customer's screen ────────────────────
    if (action === 'set_visibility') {
      const refund = await setRefundVisibility(refundId, Boolean(body.visible), admin.userId);
      if (!refund) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Refund request not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, refund });
    }

    // ─── Edit the payout details on a ticket ──────────────────────────────
    if (action === 'update_details') {
      const fields: Parameters<typeof updateRefundDetails>[1] = {};
      if (typeof body.reason === 'string') fields.reason = body.reason.trim();
      if (typeof body.phone === 'string') fields.phone = body.phone.trim();
      if (typeof body.admin_note === 'string') fields.admin_note = body.admin_note.trim();
      const info =
        body.bank_info && typeof body.bank_info === 'object'
          ? (body.bank_info as Record<string, unknown>)
          : {};
      const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
      // Accept the payout fields either nested under `bank_info` or flat on the
      // body, so a direct API caller cannot silently no-op on a bank edit. Only
      // keys actually supplied are forwarded; blank strings would otherwise
      // overwrite the values already recorded on the ticket.
      const bankName = str(info.bank_name ?? body.bank_name);
      const accountNumber = str(info.account_number ?? body.account_number);
      const accountHolder = str(info.account_holder ?? body.account_holder);
      const bankPatch: Record<string, string> = {};
      for (const [key, value] of Object.entries(info)) {
        if (typeof value === 'string' || typeof value === 'number') bankPatch[key] = String(value);
      }
      if (bankName) bankPatch.bank_name = bankName;
      if (accountNumber) bankPatch.account_number = accountNumber;
      if (accountHolder) bankPatch.account_holder = accountHolder;
      if (Object.keys(bankPatch).length > 0) {
        fields.bank_info = bankPatch;
      }
      if (Object.keys(fields).length === 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Không có trường nào để cập nhật' },
          { status: 400 }
        );
      }
      const refund = await updateRefundDetails(refundId, fields, admin.userId);
      if (!refund) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Refund request not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, refund });
    }

    // ─── Default: change workflow status ──────────────────────────────────
    const { status } = body;

    if (typeof status !== 'string' || !status) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Atomic refund processing: If status is approved/completed, release seats and update booking
    let refundSummary = '';
    if (status === 'approved' || status === 'completed') {
      try {
        const results = await sql`
          SELECT r.booking_id, r.amount, b.user_id
          FROM refund_requests r
          JOIN bookings b ON r.booking_id = b.id
          WHERE r.id = ${refundId}
        `;
        const refundRecord = results[0];
        if (refundRecord?.booking_id) {
          // 1. Release seats (booked seats for this booking become available again)
          await sql`DELETE FROM seats WHERE booking_id = ${refundRecord.booking_id}`;

          // 2. If the booking was paid with the wallet, refund the money back into it.
          //    Without this step the money would vanish even though the seat is released.
          const paymentResults = await sql`
            SELECT method, amount FROM payments
            WHERE booking_id = ${refundRecord.booking_id} AND status = 'completed'
            ORDER BY created_at DESC LIMIT 1
          `;
          const payment = paymentResults[0];
          let walletRefunded = false;
          if (payment?.method === 'wallet' && refundRecord.user_id) {
            const refundAmount = Number(refundRecord.amount) || Number(payment.amount);
            try {
              await refundWallet(
                refundRecord.user_id,
                refundAmount,
                refundRecord.booking_id,
                `Hoàn tiền vé máy bay #${refundRecord.booking_id}`
              );
              walletRefunded = true;
            } catch (walletErr) {
              // Do not block the refund approval if wallet credit fails; log for manual processing.
              console.error(
                `[REFUND] Failed to credit wallet for booking ${refundRecord.booking_id}:`,
                walletErr
              );
            }
          }

          // 3. Mark booking as refunded
          await sql`
            UPDATE bookings SET status = 'refunded', updated_at = NOW()
            WHERE id = ${refundRecord.booking_id}
          `;
          refundSummary = walletRefunded
            ? ' Seats released, wallet credited and booking marked as refunded'
            : ' Seats released and booking marked as refunded';
          console.info(
            `[REFUND] Processing refund for booking ${refundRecord.booking_id}:${refundSummary}`
          );
        }
      } catch (dbErr) {
        console.error('Error during flight seat release for refund:', dbErr);
      }
    }

    const operatorNote = typeof body.admin_note === 'string' ? body.admin_note.trim() : null;

    // Narrowed to string above and checked against validStatuses, so this cast
    // cannot smuggle an unvalidated value through.
    const result = await updateRefundStatus(
      refundId,
      status as RefundRecord['status'],
      operatorNote || undefined
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Refund request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Refund status updated to ${status}.${refundSummary}`,
      refundId,
      status,
    });
  } catch (error) {
    console.error('Error updating refund status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update refund status' },
      { status: 500 }
    );
  }
}
