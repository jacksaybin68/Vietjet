/**
 * Tra tài khoản theo định danh đăng nhập.
 *
 * Một người có thể đăng nhập bằng **email**, **số điện thoại** (mọi cách viết)
 * hoặc **mã hội viên SkyJoy**. Gộp cả ba vào một truy vấn để `dang-nhap` và
 * `dang-nhap-otp` không thể lệch nhau về cách tìm tài khoản — trước đây mỗi
 * route tự viết một câu và rất dễ thêm định danh mới cho một nửa hệ thống.
 *
 * Email so sánh không phân biệt hoa/thường (RFC 5321), số điện thoại so cả bản
 * thô lẫn bản chuẩn hoá (`0986349061` ⇄ `+84 986 349 061`), mã hội viên so
 * không phân biệt hoa/thường.
 */

import { sql } from '@/lib/neon';
import { normalizePhone } from '@/lib/utils';
import { isSkyjoyMemberId, normalizeSkyjoyMemberId } from '@/lib/skyjoy';

export interface AccountRecord {
  id: string;
  email: string | null;
  password_hash: string | null;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  locked_until: string | null;
  failed_login_attempts: number | null;
  salutation: string | null;
  last_name: string | null;
  first_name: string | null;
  skyjoy_member_id: string | null;
}

/**
 * @param identifier email / số điện thoại / mã hội viên, đã được trim.
 * @returns hàng tài khoản đầu tiên khớp, hoặc `null`.
 */
export async function findAccountByIdentifier(identifier: string): Promise<AccountRecord | null> {
  const phoneIdentifier = normalizePhone(identifier);
  // Chỉ tìm theo mã hội viên khi chuỗi đúng dạng, để một email tình cờ khớp
  // regex (không thể, nhưng vẫn rõ ràng) không tạo nhánh truy vấn thừa.
  const memberId = isSkyjoyMemberId(identifier) ? normalizeSkyjoyMemberId(identifier) : null;

  const rows = await sql`
    SELECT id, email, password_hash, full_name, role, phone, avatar_url, created_at, updated_at,
           locked_until, failed_login_attempts, salutation, last_name, first_name, skyjoy_member_id
    FROM user_profiles
    WHERE LOWER(email) = LOWER(${identifier})
       OR phone = ${identifier}
       OR (${phoneIdentifier}::text IS NOT NULL AND phone = ${phoneIdentifier}::text)
       OR (${memberId}::text IS NOT NULL AND UPPER(skyjoy_member_id) = ${memberId}::text)
  `;

  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0] as AccountRecord;
}
