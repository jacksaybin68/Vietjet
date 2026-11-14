import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getDashboardSummaryData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const {
      payload: _payload,
      error,
      response,
    } = await verifyAdminRequest(request, 'analytics:view');
    if (error) return response;

    const summary = await getDashboardSummaryData();

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching admin dashboard summary:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
