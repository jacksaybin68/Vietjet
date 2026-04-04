import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashPassword,
  comparePassword,
  validatePassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateTokenFamily,
  parseTokenPayload,
} from '@/lib/auth';

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'Test@123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'Test@123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Password Validation', () => {
    it('should validate a strong password', () => {
      const result = validatePassword('Strong@Pass1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Ab@1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 8 ký tự');
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('lowercase@123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 chữ in hoa');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('UPPERCASE@123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 chữ thường');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers@abc');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 số');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
    });

    it('should collect all validation errors', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Token Generation', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should generate valid access and refresh tokens', () => {
      const tokens = generateTokens(mockUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should verify valid access token', () => {
      const tokens = generateTokens(mockUser);
      const payload = verifyAccessToken(tokens.accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.role).toBe(mockUser.role);
      expect(payload?.fullName).toBe(mockUser.full_name);
    });

    it('should verify valid refresh token', () => {
      const tokens = generateTokens(mockUser);
      const payload = verifyRefreshToken(tokens.refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.id);
    });

    it('should return null for invalid token', () => {
      const payload = verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token (simulated)', () => {
      const payload = verifyAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiZmFsbE5hbWUiOiJUZXN0IFVzZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.fake');
      expect(payload).toBeNull();
    });
  });

  describe('Token Hashing', () => {
    it('should hash a token consistently', () => {
      const token = 'test-refresh-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should generate unique token families', () => {
      const family1 = generateTokenFamily();
      const family2 = generateTokenFamily();

      expect(family1).not.toBe(family2);
    });
  });

  describe('Token Payload Parsing', () => {
    it('should parse valid token payload', () => {
      const tokens = generateTokens({
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const payload = parseTokenPayload(tokens.accessToken);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-123');
    });

    it('should return null for invalid token', () => {
      const payload = parseTokenPayload('invalid.token.here');
      expect(payload).toBeNull();
    });
  });
});
