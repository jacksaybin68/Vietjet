import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A status the badge table forgot took down a whole page.
 *
 * `/tai-khoan` and the admin `BookingsTab` both index their `STATUS_MAP`
 * directly (`STATUS_MAP[status].label` / `.cls`). With `pending` missing, a
 * single unpaid booking threw `Cannot read properties of undefined`, the
 * page-level ErrorBoundary caught it, and the customer lost the dashboard —
 * wallet, loyalty points, profile — because of one row. `refunded` was missing
 * from the admin map for the same reason.
 *
 * These read the source rather than rendering both dashboards, because the
 * failure is a lookup that only throws for a status the fixture does not
 * contain; rendering with a synthetic row would have to re-implement the map to
 * prove it is complete.
 */
const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'] as const;

const FILES = [
  'src/app/tai-khoan/components/UserDashboardClient.tsx',
  'src/features/admin/components/BookingsTab.tsx',
  'src/app/tra-cuu/page.tsx',
] as const;

describe('bảng nhãn trạng thái đặt vé phủ hết status trong DB', () => {
  it.each(FILES)('%s khai báo mọi status bookings.status có thể mang', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    const map = /const STATUS_MAP[^=]*= \{([\s\S]*?)\n\};/.exec(source);
    expect(map).not.toBeNull();

    for (const status of BOOKING_STATUSES) {
      expect(map![1]).toMatch(new RegExp(`\\b${status}:`));
    }
  });

  it.each(FILES)('%s không index STATUS_MAP mà không có fallback', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    // A bare `STATUS_MAP[x].y` throws on an unknown status; `?.y` or a helper
    // with `??` returns something instead. Only the lookups that render a
    // status matter — the filter label already used `?.`.
    const bare = [...source.matchAll(/STATUS_MAP\[[^\]]+\]\s*\.\w+/g)].map((m) => m[0]);
    expect(bare).toEqual([]);
  });
});

/**
 * The same trap anywhere else: a lookup table indexed without a fallback is
 * only safe while the table happens to list every value the API can return.
 * Swept over the whole tree so the next status map is written with a backstop
 * rather than discovered through a customer's error boundary.
 */
describe('không còn lookup bảng trạng thái nào thiếu fallback', () => {
  it('mọi STATUS_MAP[...] đều dùng ?. hoặc helper có fallback', () => {
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        // Skip this file: it necessarily contains the pattern as a literal.
        if (entry.name === 'booking-status-badge.test.ts') continue;
        const source = readFileSync(full, 'utf8');
        for (const match of source.matchAll(/STATUS_MAP\[[^\]]+\]\s*\.\w+/g)) {
          offenders.push(`${full.replace(`${process.cwd()}/`, '')}: ${match[0]}`);
        }
      }
    };

    walk(join(process.cwd(), 'src'));
    expect(offenders).toEqual([]);
  });
});

/**
 * `NUMERIC` columns arrive from the driver as *strings*. Handing one to a
 * reducer with `+` concatenates instead of adding, which is how the refund
 * header rendered "01975873.00₫" — a figure no customer would recognise, on a
 * screen the operator uses to decide what to pay.
 *
 * The failure is invisible in every other view of the same row (a badge, a
 * name), so it is swept by shape: any row-mapper that copies a numeric column
 * across without coercing it.
 */
describe('map row phải ép kiểu số trước khi dùng', () => {
  const MAPPERS: { file: string; column: string }[] = [
    { file: 'src/features/admin/components/RefundRequestsTab.tsx', column: 'amount' },
  ];

  it.each(MAPPERS)('$file ép $column bằng Number()', ({ file, column }) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    // Only the mapper matters: a type declaration and mock data carry no
    // coercion requirement.
    const mapRow = /const mapRow = \(row:[\s\S]*?\n {2}\}\);/.exec(source);
    expect(mapRow).not.toBeNull();

    const assignments = [...mapRow![0].matchAll(new RegExp(`${column}:\\s*[^,\\n]+`, 'g'))];
    expect(assignments.length).toBeGreaterThan(0);
    for (const match of assignments) {
      // A passthrough (`row.amount || 0`) keeps the string; `Number(...)` does not.
      expect(match[0]).toMatch(/Number\(/);
    }
  });
});
