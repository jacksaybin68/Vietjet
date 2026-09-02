import { NextRequest, NextResponse } from 'next/server';
import { spendLoyaltyPoints, getOrEnrollLoyalty } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const body = await request.json();
    const { points, description } = body;

    // Validation
    if (!points || typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Points must be a positive number' },
        { status: 400 }
      );
    }

    try {
      const transaction = await spendLoyaltyPoints(
        user.userId,
        points,
        description || 'Đổi điểm thư้ng'
      );

      const loyalty = await getOrEnrollLoyalty(user.userId);

      return NextResponse.json(
        {
          success: true,
          message: 'Đổi điểm thành công',
          transaction,
          loyalty: {
            availablePoints: loyalty.available_points,
            totalPoints: loyalty.total_points,
            lifetimePoints: loyalty.lifetime_points,
            tier: loyalty.tier,
          },
        },
        { status: 201 }
      );
    } catch (dbError: any) {
      if (dbError.message === 'Insufficient loyalty points') {
        return NextResponse.json(
          { error: 'Insufficient Points', message: 'Bạn không có đủ điểm thưởng để đổi' },
          { status: 400 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Loyalty Exchange API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
