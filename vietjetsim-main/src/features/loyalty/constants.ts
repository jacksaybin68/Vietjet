// Loyalty-related constants

export const LOYALTY_API_ENDPOINTS = {
  GET_TIER: '/api/loyalty/tier',
  GET_POINTS: '/api/loyalty/points',
  REDEEM_POINTS: '/api/loyalty/redeem',
  HISTORY: '/api/loyalty/history',
} as const;

export const LOYALTY_TIERS = {
  SILVER: { name: 'Silver', minPoints: 0, benefits: ['5% discount'] },
  GOLD: { name: 'Gold', minPoints: 10000, benefits: ['10% discount', 'Priority booking'] },
  PLATINUM: {
    name: 'Platinum',
    minPoints: 50000,
    benefits: ['15% discount', 'Priority booking', 'Free baggage'],
  },
} as const;

export const LOYALTY_ACTIVITIES = {
  FLIGHT_BOOKING: { name: 'Đặt vé', multiplier: 1 },
  ANCILLARY_PURCHASE: { name: 'Mua dịch vụ bổ sung', multiplier: 1.5 },
  CREDIT_CARD_PAYMENT: { name: 'Thanh toán bằng thẻ', multiplier: 2 },
} as const;

export const LOYALTY_REDEMPTION = {
  MIN_POINTS: 1000,
  MAX_POINTS: 1000000,
  POINTS_TO_DISCOUNT_RATIO: 100, // 100 points = 1% discount
} as const;
