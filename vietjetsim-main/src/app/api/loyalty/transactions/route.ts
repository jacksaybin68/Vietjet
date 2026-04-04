import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getOrEnrollLoyalty, getLoyaltyTransactions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const loyalty = await getOrEnrollLoyalty(payload.userId);
    const result = await getLoyaltyTransactions(payload.userId, { page, limit });

    return NextResponse.json({ transactions: result.transactions });
  } catch (error) {
    console.error('Error in GET /api/loyalty/transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
