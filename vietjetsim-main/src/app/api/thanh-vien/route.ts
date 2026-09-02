import { NextRequest, NextResponse } from 'next/server';
import { getUserLoyaltyWithProgram } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const loyaltyData = await getUserLoyaltyWithProgram(user.userId);
    
    if (!loyaltyData) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Loyalty data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: {
        id: loyaltyData.loyalty.id,
        tier: loyaltyData.loyalty.tier,
        currentPoints: loyaltyData.loyalty.available_points,
        lifetimePoints: loyaltyData.loyalty.lifetime_points,
        enrolledAt: loyaltyData.loyalty.joined_at,
      },
      program: {
        name: loyaltyData.program.name,
        pointsPerThousandVnd: loyaltyData.program.points_per_1000_vnd,
        minPointsToRedeem: loyaltyData.program.min_points_to_redeem,
      },
      tiers: loyaltyData.tiers.map((tier) => ({
        name: tier.name,
        minLifetimePoints: tier.min_lifetime_points,
        pointsMultiplier: tier.points_multiplier,
        benefits: tier.benefits,
      })),
    });
  } catch (error: any) {
    console.error('Membership API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
