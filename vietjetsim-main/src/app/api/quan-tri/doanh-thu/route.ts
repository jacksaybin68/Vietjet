import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getRevenueStats, getBookingStatusDistribution, getRecentActivity } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'analytics:view');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const [revenueStats, statusDistribution, recentActivity] = await Promise.all([
      getRevenueStats(),
      getBookingStatusDistribution(),
      getRecentActivity(10),
    ]);

    return NextResponse.json({
      revenue: revenueStats,
      statusDistribution,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch revenue stats' },
      { status: 500 }
    );
  }
}
