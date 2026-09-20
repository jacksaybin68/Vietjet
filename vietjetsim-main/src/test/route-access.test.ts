import { describe, it, expect } from 'vitest';
import { isPublicRoute, isPublicApiRoute } from '@/lib/route-access';

describe('route access classification', () => {
  describe('isPublicRoute', () => {
    it('allows the anonymous search and lookup pages', () => {
      expect(isPublicRoute('/')).toBe(true);
      expect(isPublicRoute('/tim-ve')).toBe(true);
      expect(isPublicRoute('/chuyen-bay-cua-toi')).toBe(true);
      expect(isPublicRoute('/lam-thu-tuc')).toBe(true);
      expect(isPublicRoute('/dat-ve')).toBe(true);
    });

    it('matches nested paths but not lookalike prefixes', () => {
      expect(isPublicRoute('/dat-ve/abc')).toBe(true);
      expect(isPublicRoute('/dat-ve-xyz')).toBe(false);
      expect(isPublicRoute('/tai-khoan')).toBe(false);
      expect(isPublicRoute('/quan-tri')).toBe(false);
    });
  });

  describe('isPublicApiRoute', () => {
    it('allows flight search so the search page works signed out', () => {
      expect(isPublicApiRoute('/api/chuyen-bay')).toBe(true);
    });

    it('allows booking-code check-in lookup and bank config', () => {
      expect(isPublicApiRoute('/api/checkin')).toBe(true);
      expect(isPublicApiRoute('/api/cong-khai/cau-hinh-ngan-hang')).toBe(true);
    });

    it('keeps authenticated data routes private', () => {
      const privateRoutes = [
        '/api/dat-ve',
        '/api/hoan-tien',
        '/api/thong-bao',
        '/api/thanh-toan',
        '/api/vi',
        '/api/xac-thuc/lam-moi',
      ];
      for (const route of privateRoutes) {
        expect(isPublicApiRoute(route)).toBe(false);
      }
    });

    it('does not treat an unknown /api path as public', () => {
      expect(isPublicApiRoute('/api/khong-ton-tai')).toBe(false);
    });
  });
});
