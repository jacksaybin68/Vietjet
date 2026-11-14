import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getPageLayout, upsertPageLayout } from '@/lib/db';
import { normalizeLayout } from '@/features/visual-editor/utils/layout';
import type { PageLayout } from '@/features/visual-editor/types';

export const dynamic = 'force-dynamic';

/** Các trang hiện hỗ trợ soạn thảo trực quan. */
const SUPPORTED_PAGES = ['/trang-chu'] as const;

function isSupportedPage(pagePath: string): pagePath is (typeof SUPPORTED_PAGES)[number] {
  return (SUPPORTED_PAGES as readonly string[]).includes(pagePath);
}

/**
 * Đọc/ghi bố cục trang cho trình soạn thảo trực quan.
 *
 * Yêu cầu quyền `system:config` — cùng quyền với cấu hình hệ thống, vì
 * bố cục trang ảnh hưởng trực tiếp tới nội dung mà mọi khách nhìn thấy.
 *
 * Bản ghi bố cục KHÔNG chứa HTML tùy ý: server chuẩn hoá lại `layout` qua
 * `normalizeLayout` trước khi ghi, nên allow-list style được áp dụng ở
 * phía server chứ không phải chỉ ở client.
 */
export async function GET(request: NextRequest) {
  const { error, response } = await verifyAdminRequest(request, 'system:config');
  if (error) return response;

  const pagePath = request.nextUrl.searchParams.get('page') ?? '/trang-chu';
  if (!isSupportedPage(pagePath)) {
    return NextResponse.json(
      { error: 'Bad Request', message: `Trang chưa hỗ trợ soạn thảo trực quan: ${pagePath}` },
      { status: 400 }
    );
  }

  try {
    const record = await getPageLayout(pagePath);

    return NextResponse.json({
      ok: true,
      pagePath,
      layout: record ? normalizeLayout(record.layout) : null,
      updatedBy: record?.updated_by ?? null,
      updatedAt: record?.updated_at ?? null,
    });
  } catch (err) {
    console.error('Error loading page layout:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Không đọc được bố cục trang' },
      { status: 500 }
    );
  }
}

/**
 * Lưu bố cục trang.
 *
 * `layout` trong body được chuẩn hoá trước khi ghi: section lạ bị loại,
 * style ngoài allow-list bị bỏ, section thiếu được chèn lại. Nhờ vậy nội
 * dung trong DB luôn đúng shape mà phía render mong đợi.
 */
export async function PUT(request: NextRequest) {
  const { payload, error, response } = await verifyAdminRequest(request, 'system:config');
  if (error) return response;

  let body: { pagePath?: unknown; layout?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Body không phải JSON hợp lệ' },
      { status: 400 }
    );
  }

  const pagePath = typeof body.pagePath === 'string' ? body.pagePath : '/trang-chu';
  if (!isSupportedPage(pagePath)) {
    return NextResponse.json(
      { error: 'Bad Request', message: `Trang chưa hỗ trợ soạn thảo trực quan: ${pagePath}` },
      { status: 400 }
    );
  }

  if (!body.layout || typeof body.layout !== 'object') {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Thiếu bố cục (layout)' },
      { status: 400 }
    );
  }

  try {
    const layout: PageLayout = normalizeLayout(body.layout);
    const record = await upsertPageLayout({
      pagePath,
      layout,
      updatedBy: payload.email ?? payload.userId ?? null,
    });

    return NextResponse.json({
      ok: true,
      pagePath: record.page_path,
      layout: normalizeLayout(record.layout),
      updatedBy: record.updated_by,
      updatedAt: record.updated_at,
    });
  } catch (err) {
    console.error('Error saving page layout:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Không lưu được bố cục trang' },
      { status: 500 }
    );
  }
}
