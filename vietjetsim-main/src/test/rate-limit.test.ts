/**
 * Unit Tests for Rate Limiting Module
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
  rateLimit,
  getClientIP,
  createRateLimitKey,
  RATE_LIMITS,
  legacyRateLimit,
  rateLimiter,
  _clearStore,
} from '@/lib/rate-limit';

// Set up globals for test environment
beforeAll(() => {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
});

describe('Rate Limit Config', () => {
  it('should have auth config with 5 requests per minute', () => {
    expect(RATE_LIMITS.auth.maxRequests).toBe(5);
    expect(RATE_LIMITS.auth.windowMs).toBe(60_000);
  });

  it('should have strict config with 3 requests per minute', () => {
    expect(RATE_LIMITS.strict.maxRequests).toBe(3);
    expect(RATE_LIMITS.strict.windowMs).toBe(60_000);
  });

  it('should have api config with 100 requests per minute', () => {
    expect(RATE_LIMITS.api.maxRequests).toBe(100);
    expect(RATE_LIMITS.api.windowMs).toBe(60_000);
  });
});

describe('IP Extraction', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    expect(getClientIP(request)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'x-real-ip': '192.168.1.2' },
    });
    expect(getClientIP(request)).toBe('192.168.1.2');
  });

  it('should return unknown when no IP headers present', () => {
    const request = new Request('http://localhost/api/test');
    expect(getClientIP(request)).toBe('unknown');
  });
});

describe('Rate Limit Key Creation', () => {
  it('should create key in correct format', () => {
    const key = createRateLimitKey('192.168.1.1', 'POST', '/api/test');
    expect(key).toBe('192.168.1.1:POST:/api/test');
  });
});

describe('Rate Limiter Convenience Functions', () => {
  beforeEach(() => {
    _clearStore();
  });

  it('should use auth config', () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    const result = rateLimiter.auth(request);
    expect(result).toBeNull(); // First request should be allowed
  });

  it('should use strict config', () => {
    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.2' },
    });
    const result = rateLimiter.strict(request);
    expect(result).toBeNull();
  });

  it('should use api config', () => {
    const request = new Request('http://localhost/api/data', {
      method: 'GET',
      headers: { 'x-forwarded-for': '10.0.0.3' },
    });
    const result = rateLimiter.api(request);
    expect(result).toBeNull();
  });
});

describe('Legacy Rate Limit Function', () => {
  beforeEach(() => {
    _clearStore();
  });

  it('should return null for first request (not limited)', () => {
    const request = new Request('http://localhost/api/test');
    const result = legacyRateLimit(request);
    expect(result).toBeNull();
  });

  it('should allow multiple requests within limit', () => {
    const request = new Request('http://localhost/api/test-limited', {
      headers: { 'x-forwarded-for': '10.0.0.100' },
    });
    
    // Make 5 requests (should all pass)
    for (let i = 0; i < 5; i++) {
      const result = rateLimit(request, RATE_LIMITS.auth);
      expect(result).toBeNull();
    }
  });

  it('should respect custom options', () => {
    _clearStore();
    const request = new Request('http://localhost/api/test-custom', {
      headers: { 'x-forwarded-for': '10.0.0.200' },
    });
    
    // With custom limit of 2
    for (let i = 0; i < 2; i++) {
      const result = rateLimit(request, { windowMs: 60_000, maxRequests: 2 });
      expect(result).toBeNull();
    }
    
    // 3rd request should be blocked
    const result = rateLimit(request, { windowMs: 60_000, maxRequests: 2 });
    expect(result?.status).toBe(429);
  });
});
