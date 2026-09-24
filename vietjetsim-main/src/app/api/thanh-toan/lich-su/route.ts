import { NextRequest, NextResponse } from 'next/server';
import { getPaymentHistory } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';
import { parsePaginationParams, getPaginationMeta } from '@/lib/pagination';
import { getApiErrorMessage } from '@/shared/services';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    const result = await getPaymentHistory(user.userId, { page, limit });

    return NextResponse.json({
      success: true,
      payments: result.payments,
      pagination: getPaginationMeta(page, limit, result.total),
    });
  } catch (error) {
    console.error('Payment History API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: getApiErrorMessage(error, 'Lỗi hệ thống') },
      { status: 500 }
    );
  }
}
