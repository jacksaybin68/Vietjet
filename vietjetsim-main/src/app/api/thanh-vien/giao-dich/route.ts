import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getLoyaltyTransactions } from '@/lib/db';
import { parsePaginationParams, getPaginationMeta } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    const result = await getLoyaltyTransactions(payload.userId, { page, limit });

    return NextResponse.json({
      transactions: result.transactions,
      pagination: getPaginationMeta(page, limit, result.total),
    });
  } catch (error) {
    console.error('Error in GET /api/thanh-vien/giao-dich:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
