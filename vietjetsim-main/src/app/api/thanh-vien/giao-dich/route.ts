import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getLoyaltyTransactions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const result = await getLoyaltyTransactions(payload.userId, { page, limit });

    return NextResponse.json({
      transactions: result.transactions,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/thanh-vien/giao-dich:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
