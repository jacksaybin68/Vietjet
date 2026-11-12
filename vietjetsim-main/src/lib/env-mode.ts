/**
 * Which datastore the server is running against.
 *
 * `@/lib/neon` falls back to an in-memory mock when `DATABASE_URL` is unset in
 * development/test. That fallback is deliberate, but it is also invisible to
 * the customer: a booking "succeeds" and then disappears on the next request.
 * Keeping the decision in one pure function lets the root layout render a
 * warning without importing the database driver (which throws in production
 * without `DATABASE_URL`).
 */
export type EnvLike = Record<string, string | undefined>;

export function isMockDatabaseMode(env: EnvLike = process.env): boolean {
  return !env.DATABASE_URL && env.NODE_ENV !== 'production';
}

/** Human-readable label for the UI. */
export const MOCK_DATABASE_NOTICE =
  'Đang dùng dữ liệu giả lập cục bộ — chưa cấu hình DATABASE_URL. Thay đổi sẽ không được lưu.';
