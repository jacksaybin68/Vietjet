import { describe, it, expect } from 'vitest';
import { isPublicRoute, isPublicApiRoute } from '@/lib/route-access';

describe('route access classification', () => {
  describe('isPublicRoute', () => {
    it('allows the anonymous search and lookup pages', () => {
      expect(isPublicRoute('/')).toBe(true);
      expect(isPublicRoute('/tim-ve')).toBe(true);
      expect(isPublicRoute('/chuyen-bay-cua-toi')).toBe(true);
      expect(isPublicRoute('/lam-thu-tuc')).toBe(true);
      expect(isPublicRoute('/lam-thu-tuc-truc-tuyen')).toBe(true);
      expect(isPublicRoute('/dat-ve')).toBe(true);
    });

    it('matches nested paths but not lookalike prefixes', () => {
      expect(isPublicRoute('/dat-ve/abc')).toBe(true);
      expect(isPublicRoute('/dat-ve-xyz')).toBe(false);
      expect(isPublicRoute('/tai-khoan')).toBe(false);
      expect(isPublicRoute('/quan-tri')).toBe(false);
    });

    it('allows the password recovery pages without a session', () => {
      expect(isPublicRoute('/dang-nhap')).toBe(true);
      expect(isPublicRoute('/quen-mat-khau')).toBe(true);
      expect(isPublicRoute('/dat-lai-mat-khau')).toBe(true);
    });

    it('keeps the programs alias public so its own redirect can run', () => {
      expect(isPublicRoute('/hanh-ly')).toBe(true);
      expect(isPublicRoute('/hanh-ly/')).toBe(true);
    });

    it('keeps marketing and support pages browsable signed out', () => {
      for (const p of ['/dich-vu', '/gioi-thieu', '/hoi-dap', '/lien-he', '/tra-cuu']) {
        expect(isPublicRoute(p)).toBe(true);
      }
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

    it('allows the CSRF bootstrap and refresh-token rotation without a session', () => {
      expect(isPublicApiRoute('/api/csrf')).toBe(true);
      expect(isPublicApiRoute('/api/xac-thuc/lam-moi')).toBe(true);
    });

    it('keeps authenticated data routes private', () => {
      const privateRoutes = [
        '/api/dat-ve',
        '/api/hoan-tien',
        '/api/thong-bao',
        '/api/thanh-toan',
        '/api/vi',
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
