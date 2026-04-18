/**
 * Pagination Helper Utilities
 *
 * Standard pagination response format and helpers for API routes.
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResult;
}

/**
 * Parse pagination params from request, with defaults
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: Partial<PaginationParams> = {}
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaults.page || 1), 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || String(defaults.limit || 20), 10))
  );

  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(page: number, limit: number, total: number): PaginationResult {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Format paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: getPaginationMeta(page, limit, total),
  };
}

/**
 * Calculate SQL offset from page and limit
 */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Validate and sanitize sort parameters
 */
export function parseSortParams<T extends string>(
  searchParams: URLSearchParams,
  allowedFields: readonly T[],
  defaultField: T,
  defaultDirection: 'asc' | 'desc' = 'desc'
): { field: T; direction: 'asc' | 'desc' } {
  const field = searchParams.get('sort') as T;
  const direction = searchParams.get('order') as 'asc' | 'desc' | null;

  return {
    field: allowedFields.includes(field) ? field : defaultField,
    direction: direction === 'asc' || direction === 'desc' ? direction : defaultDirection,
  };
}
