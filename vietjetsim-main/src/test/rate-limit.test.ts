/**
 * Unit Tests for Rate Limiting Module
 * 
 * Tests rate limit enforcement and Redis fallback behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
  };
});

afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});

// Import after setting environment variables
import {
  rateLimit,
  getClientIP,
  createRateLimitKey,
  RATE_LIMITS,
  legacyRateLimit,
} from '@/lib/rate-limit';

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
    const headers = new Headers();
    headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');
    
    const request = new Request('http://localhost', { headers });

    const ip = getClientIP(request);
    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '172.16.0.1');
    
    const request = new Request('http://localhost', { headers });

    const ip = getClientIP(request);
    expect(ip).toBe('172.16.0.1');
  });

  it('should return unknown when no IP headers present', () => {
    const request = new Request('http://localhost');
    const ip = getClientIP(request);
    expect(ip).toBe('unknown');
  });
});

describe('Rate Limit Key Creation', () => {
  it('should create key with IP and path', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '192.168.1.100');
    const request = new Request('http://localhost/api/users', { headers });

    const key = createRateLimitKey(request);
    expect(key).toContain('192.168.1.100');
    expect(key).toContain('api/users');
  });

  it('should add suffix when provided', () => {
    const request = new Request('http://localhost/api/test');
    const key = createRateLimitKey(request, 'login');
    expect(key).toContain(':login');
  });

  it('should handle unknown IP', () => {
    const request = new Request('http://localhost/api/test');
    const key = createRateLimitKey(request);
    expect(key).toContain('unknown');
  });
});

describe('In-Memory Rate Limiting (Fallback)', () => {
  it('should allow first request', async () => {
    const result = await rateLimit.auth('test-user-1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should decrement remaining count', async () => {
    await rateLimit.auth('test-user-2');
    const result = await rateLimit.auth('test-user-2');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it('should block after exceeding limit', async () => {
    // Use unique identifier for this test
    const uniqueId = `test-user-overlimit-${Date.now()}`;
    
    // Make 5 requests (the limit for auth)
    for (let i = 0; i < 5; i++) {
      await rateLimit.auth(uniqueId);
    }
    
    // 6th request should be blocked
    const result = await rateLimit.auth(uniqueId);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.response).toBeDefined();
  });

  it('should include retry information in response', async () => {
    const uniqueId = `test-retry-${Date.now()}`;
    
    for (let i = 0; i < 5; i++) {
      await rateLimit.auth(uniqueId);
    }
    
    const result = await rateLimit.auth(uniqueId);
    expect(result.response).toBeDefined();
    
    const responseJson = await result.response?.json();
    expect(responseJson).toHaveProperty('retryAfter');
  });

  it('should track limits separately per identifier', async () => {
    const uniqueId1 = `test-user-a-${Date.now()}`;
    const uniqueId2 = `test-user-b-${Date.now()}`;
    
    await rateLimit.auth(uniqueId1);
    await rateLimit.auth(uniqueId1);
    
    const result = await rateLimit.auth(uniqueId2);
    expect(result.remaining).toBe(4); // Should not be affected by user A
  });
});

describe('Strict Rate Limiting', () => {
  it('should have stricter limit than auth', () => {
    expect(RATE_LIMITS.strict.maxRequests).toBeLessThan(RATE_LIMITS.auth.maxRequests);
  });

  it('should block after 3 requests', async () => {
    const uniqueId = `test-strict-${Date.now()}`;
    
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit.strict(uniqueId);
      expect(result.success).toBe(true);
    }
    
    const result = await rateLimit.strict(uniqueId);
    expect(result.success).toBe(false);
  });
});

describe('API Rate Limiting', () => {
  it('should allow many requests within limit', async () => {
    const uniqueId = `test-api-${Date.now()}`;
    
    // Should allow up to 100 requests
    for (let i = 0; i < 50; i++) {
      const result = await rateLimit.api(uniqueId);
      expect(result.success).toBe(true);
    }
  });

  it('should block after exceeding 100 requests', async () => {
    const uniqueId = `test-api-overlimit-${Date.now()}`;
    
    for (let i = 0; i < 100; i++) {
      await rateLimit.api(uniqueId);
    }
    
    const result = await rateLimit.api(uniqueId);
    expect(result.success).toBe(false);
  });
});

describe('Legacy Rate Limit Function', () => {
  it('should return null for first request (not limited)', () => {
    const request = new Request('http://localhost/api/test');
    const result = legacyRateLimit(request);
    expect(result).toBeNull();
  });

  it('should return 429 response when limited', () => {
    const request = new Request('http://localhost/api/test');
    // Make many requests to trigger limit
    for (let i = 0; i < 100; i++) {
      legacyRateLimit(request);
    }
    const result = legacyRateLimit(request);
    expect(result?.status).toBe(429);
  });

  it('should respect custom options', () => {
    const request = new Request('http://localhost/api/test');
    // With custom limit of 5
    for (let i = 0; i < 5; i++) {
      legacyRateLimit(request, { maxRequests: 5 });
    }
    const result = legacyRateLimit(request, { maxRequests: 5 });
    expect(result?.status).toBe(429);
  });
});
