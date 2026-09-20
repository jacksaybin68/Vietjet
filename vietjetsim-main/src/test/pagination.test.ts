import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  getPaginationMeta,
  getOffset,
  parseSortParams,
} from '@/lib/pagination';

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('parsePaginationParams', () => {
  it('defaults to page 1 / limit 20 when absent', () => {
    expect(parsePaginationParams(params(''))).toEqual({ page: 1, limit: 20 });
  });

  it('honours explicit values', () => {
    expect(parsePaginationParams(params('page=3&limit=50'))).toEqual({ page: 3, limit: 50 });
  });

  it('falls back to defaults for non-numeric input instead of NaN', () => {
    expect(parsePaginationParams(params('page=abc&limit=xyz'))).toEqual({ page: 1, limit: 20 });
    expect(parsePaginationParams(params('page=abc'), { page: 4 })).toEqual({ page: 4, limit: 20 });
  });

  it('clamps page to at least 1 and limit to 1..100', () => {
    expect(parsePaginationParams(params('page=0&limit=0'))).toEqual({ page: 1, limit: 1 });
    expect(parsePaginationParams(params('page=-5&limit=9999'))).toEqual({ page: 1, limit: 100 });
  });

  it('applies custom defaults', () => {
    expect(parsePaginationParams(params(''), { limit: 50 })).toEqual({ page: 1, limit: 50 });
  });
});

describe('getPaginationMeta', () => {
  it('computes total pages and neighbour flags', () => {
    expect(getPaginationMeta(1, 20, 45)).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
    expect(getPaginationMeta(3, 20, 45).hasNext).toBe(false);
    expect(getPaginationMeta(2, 20, 45).hasPrev).toBe(true);
  });

  it('reports zero pages for an empty result set', () => {
    expect(getPaginationMeta(1, 20, 0).totalPages).toBe(0);
  });
});

describe('getOffset', () => {
  it('is zero-based', () => {
    expect(getOffset(1, 20)).toBe(0);
    expect(getOffset(3, 20)).toBe(40);
  });
});

describe('parseSortParams', () => {
  const allowed = ['created_at', 'email'] as const;

  it('accepts an allowed field and direction', () => {
    expect(parseSortParams(params('sort=email&order=asc'), allowed, 'created_at')).toEqual({
      field: 'email',
      direction: 'asc',
    });
  });

  it('rejects unknown fields and directions', () => {
    expect(parseSortParams(params('sort=hacked&order=sideways'), allowed, 'created_at')).toEqual({
      field: 'created_at',
      direction: 'desc',
    });
  });
});
