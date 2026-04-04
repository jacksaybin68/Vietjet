/**
 * Neon Serverless PostgreSQL Client
 * 
 * This module provides the sql template tag for database queries.
 * In production, uses @neondatabase/serverless with connection pooling.
 * In development/demo mode, uses a mock implementation.
 */

import { neon } from '@neondatabase/serverless';

// Check if we have a real database connection
const hasRealDb = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlFn: any;

if (hasRealDb) {
  // Real Neon connection
  sqlFn = neon(process.env.DATABASE_URL!);
} else {
  // Mock implementation for development without DB
  console.warn('⚠️  DATABASE_URL not set. Using mock database. Do not use in production.');
  sqlFn = createMockSql();
}

export { sqlFn as sql };

// ─── Mock Implementation ─────────────────────────────────────────────────────

interface MockResult {
  [key: string]: unknown;
}

function createMockSql() {
  const mockData: Record<string, MockResult[]> = {
    'SELECT * FROM airports ORDER BY city': [
      { id: '1', code: 'SGN', name: 'Tân Sơn Nhất', city: 'TP Hồ Chí Minh', country: 'Vietnam', created_at: new Date().toISOString() },
      { id: '2', code: 'HAN', name: 'Nội Bài', city: 'Hà Nội', country: 'Vietnam', created_at: new Date().toISOString() },
      { id: '3', code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng', country: 'Vietnam', created_at: new Date().toISOString() },
    ],
  };

  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join('?');
    console.log('[MOCK SQL]', query, values);
    
    // Find matching mock data
    for (const [key, data] of Object.entries(mockData)) {
      if (query.toLowerCase().includes(key.toLowerCase().split('?')[0].trim())) {
        return data;
      }
    }
    
    // Return empty array for unhandled queries
    return [] as MockResult[];
  };
}
