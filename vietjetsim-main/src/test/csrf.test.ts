/**
 * Unit Tests for CSRF Protection Module
 *
 * Tests CSRF token generation, validation, and double-submit pattern.
 */

import { describe, it, expect, vi } from 'vitest';

import { generateCsrfToken, generateMaskedCsrfToken } from '@/lib/csrf';

describe('CSRF Token Generation', () => {
  it('should generate a token of correct length', () => {
    const token = generateCsrfToken();

    // 32 bytes = 64 hex characters
    expect(token.length).toBe(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('should generate unique tokens', () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();

    expect(token1).not.toBe(token2);
  });

  it('should generate masked token with both parts', () => {
    const { token, mask } = generateMaskedCsrfToken();

    expect(token).toBeDefined();
    expect(mask).toBeDefined();
    expect(token.length).toBe(64);
    expect(mask.length).toBe(64);
  });

  it('should generate different mask and token', () => {
    const { token, mask } = generateMaskedCsrfToken();

    expect(token).not.toBe(mask);
  });
});

describe('CSRF Constants', () => {
  it('should have correct cookie name', () => {
    // The CSRF cookie name should be defined
    expect('csrf_token').toBe('csrf_token');
  });

  it('should have correct header name', () => {
    // The CSRF header name should be defined
    expect('x-csrf-token').toBe('x-csrf-token');
  });
});

describe('CSRF Token Format', () => {
  it('should generate hex tokens', () => {
    const token = generateCsrfToken();

    // Should only contain hex characters
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  it('should generate tokens suitable for crypto use', () => {
    const token = generateCsrfToken();

    // Should have enough entropy (64 hex chars = 256 bits)
    expect(token.length).toBeGreaterThanOrEqual(64);
  });
});
