import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import {
  CodingPiValidationError,
  parseCodingPiRequest,
  type CodingPiRequest,
} from '@/lib/coding-pi/protocol';
import { getCodingPiConfig, isCodingPiConfigured } from '@/lib/coding-pi/config';
import {
  completeCodingPiChat,
  CODING_PI_SSE_HEADERS,
  getCodingPiStatusPayload,
  streamCodingPiChat,
  toCodingPiResponseBody,
} from '@/lib/coding-pi/service';
import { CodingPiUpstreamError } from '@/lib/coding-pi/provider';

/**
 * Coding Pi — proxy server-side tới NVIDIA NIM.
 *
 *   GET  /api/coding-pi/chat   trạng thái cấu hình (admin)
 *   POST /api/coding-pi/chat   chat, mặc định stream SSE
 *
 * Khoá `NVIDIA_API_KEY` chỉ nằm ở server. Route dùng chung cổng quyền với
 * `/api/editor/files` (`system:config`) vì công cụ duy nhất gọi nó là editor.
 *
 * POST trả SSE với các event:
 *   ready     { model }
 *   reasoning { text }              phần suy nghĩ (reasoning_content)
 *   content   { text }              phần trả lời
 *   tool_call { id?, index?, function: { name, arguments } }
 *   done      { content, reasoning, toolCalls, finishReason, usage, model }
 *   error     { error }             lỗi giữa stream (HTTP đã là 200)
 *
 * `stream: false` trả JSON một lần với cùng shape như event `done`.
 *
 * Route chỉ làm phần HTTP: xác thực, kiểm tra body rồi gọi service trong
 * `src/lib/coding-pi/service.ts`.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: cho editor biết backend đã cấu hình chưa và đang dùng model nào. */
export async function GET(req: NextRequest) {
  const { error, response } = await verifyAdminRequest(req);
  if (error) return response;

  const config = getCodingPiConfig();
  return NextResponse.json(getCodingPiStatusPayload(config, isCodingPiConfigured()));
}

export async function POST(req: NextRequest) {
  const { error, response } = await verifyAdminRequest(req, 'system:config');
  if (error) return response;

  const config = getCodingPiConfig();
  if (!config.apiKey) {
    return NextResponse.json(
      { error: 'Chưa cấu hình NVIDIA_API_KEY trên máy chủ.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body phải là JSON hợp lệ.' }, { status: 400 });
  }

  let request: CodingPiRequest;
  try {
    request = parseCodingPiRequest(body, config);
  } catch (parseError) {
    if (parseError instanceof CodingPiValidationError) {
      return NextResponse.json({ error: parseError.message }, { status: 400 });
    }
    throw parseError;
  }

  try {
    if (!request.stream) {
      const result = await completeCodingPiChat({ request, config, clientSignal: req.signal });
      return NextResponse.json(toCodingPiResponseBody(result, request.model));
    }

    const stream = await streamCodingPiChat({ request, config, clientSignal: req.signal });
    return new Response(stream, { headers: { ...CODING_PI_SSE_HEADERS } });
  } catch (upstreamError) {
    if (upstreamError instanceof CodingPiUpstreamError) {
      return NextResponse.json({ error: upstreamError.message }, { status: upstreamError.status });
    }
    throw upstreamError;
  }
}
