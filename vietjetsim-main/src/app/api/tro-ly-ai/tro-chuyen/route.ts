import { NextRequest, NextResponse } from 'next/server';
import { researchVietjetFlights } from '@/lib/openclaw/flight-researcher';
import {
  askOllama,
  getOllamaConfig,
  getOpenClawGatewayUrl,
  getProviderAttempts,
  isOllamaConfigured,
  isOpenClawGatewayConfigured,
  listOllamaModels,
  resolveAssistantProvider,
  toAssistantMessages,
  type AssistantMessage,
} from '@/lib/openclaw/ollama';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getApiErrorMessage } from '@/shared/services';

/** Câu hỏi dài nhất được gửi kèm; khớp với giới hạn của `/api/claude/chat`. */
const MAX_HISTORY_ITEMS = 20;

/**
 * Gateway OpenClaw: `POST /chat` với `{message, context, stream}`; câu trả lời
 * nằm ở `reply` / `content` / `message` tuỳ phiên bản gateway.
 */
async function askOpenClawGateway(
  message: string,
  context: AssistantMessage[]
): Promise<{ content: string; model: string | null }> {
  const apiUrl = getOpenClawGatewayUrl();
  const apiKey = process.env.OPENCLAW_API_KEY;

  const response = await fetch(`${apiUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ message, context, stream: false }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`OpenClaw API responded with ${response.status}`);
  }

  const data = (await response.json()) as {
    reply?: unknown;
    content?: unknown;
    message?: unknown;
    model?: unknown;
  };
  const reply = data.reply ?? data.content ?? data.message;

  return {
    content: typeof reply === 'string' ? reply : '',
    model: typeof data.model === 'string' && data.model ? data.model : null,
  };
}

/**
 * Trạng thái backend của trợ lý (admin-only) — để kiểm tra Ollama đã nối được
 * chưa và model nào đang có, mà không phải đoán từ một lượt chat.
 */
export async function GET(req: NextRequest) {
  const { error, response } = await verifyAdminRequest(req);
  if (error) return response;

  const config = getOllamaConfig();
  const provider = resolveAssistantProvider();
  const ollama = await listOllamaModels();

  return NextResponse.json({
    provider,
    model: provider === 'ollama' ? config.model : null,
    openclaw: {
      url: getOpenClawGatewayUrl(),
      configured: isOpenClawGatewayConfigured(),
    },
    ollama: {
      baseUrl: config.baseUrl,
      model: config.model,
      configured: isOllamaConfigured(),
      reachable: ollama.reachable,
      models: ollama.models,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Admin-only surface: the sole caller is the admin console widget. This
    // helper enforces CSRF first, then authentication and the admin role.
    const { error, response } = await verifyAdminRequest(req);
    if (error) return response;

    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // ─── OpenClaw Role Enforcement: COORDINATOR (Real-Time Flight Updates ONLY) ─
    const coordinatorSystem: AssistantMessage = {
      role: 'system',
      content: `Bạn là OpenClaw Coordinator. 
CHỨC NĂNG DUY NHẤT: Điều phối cập nhật chặng bay thực tế từ VietjetAir.com vào cơ sở dữ liệu.
QUY TẮC: 
1. Chỉ trả lời các vấn đề liên quan đến tra cứu chuyến bay thực tế, lộ trình và cập nhật thông tin chuyến bay vào admin dashboard.
2. Từ chối lịch sự mọi câu hỏi về eSIM, gói cước, hoặc hỗ trợ khách hàng chung.
3. Luôn cung cấp link tra cứu từ VietjetAir dựa trên thông tin tra cứu được.`,
    };

    // `message` là câu hỏi mới, `history` là các lượt trước. Cắt history TRƯỚC
    // khi ghép system prompt: cắt sau sẽ nuốt mất prompt điều phối khi hội thoại
    // dài, và model mất hẳn vai Coordinator.
    const context: AssistantMessage[] = [
      coordinatorSystem,
      ...toAssistantMessages(history).slice(-MAX_HISTORY_ITEMS),
    ];
    const question: AssistantMessage = { role: 'user', content: String(message).trim() };

    // Client gửi kèm câu hỏi mới ở cuối history thì bỏ bản sao, để model không
    // nhận cùng một câu hai lần.
    const lastContextMessage = context[context.length - 1];
    if (lastContextMessage?.role === 'user' && lastContextMessage.content === question.content) {
      context.pop();
    }

    const lowerMsg = String(message).toLowerCase();
    const flightKeywords = [
      'chuyến bay',
      'vé máy bay',
      'flight',
      'bay từ',
      'han',
      'sgn',
      'dad',
      'pqc',
      'cxr',
      'hph',
      'vj',
      'cập nhật',
      'route',
    ];

    const isFlightRelated = flightKeywords.some((key) => lowerMsg.includes(key));

    if (isFlightRelated) {
      const origin = lowerMsg.includes('han') || lowerMsg.includes('hà nội') ? 'HAN' : 'SGN';
      const destination = lowerMsg.includes('sgn') || lowerMsg.includes('sài gòn') ? 'SGN' : 'HAN';
      const date = new Date().toISOString().split('T')[0];

      try {
        const research = await researchVietjetFlights(origin, destination, date);
        context.push({
          role: 'system',
          content: `TRẠNG THÁI HIỆN TẠI: Đã tìm thấy lộ trình thực tế ${origin}-${destination} (${date}) tại VietjetAir. Link cập nhật: ${research.bookingUrl}. Hãy hướng dẫn người dùng sử dụng link này để đồng bộ dữ liệu vào hệ thống.`,
        });
      } catch (e) {
        console.error('Coordinator research failed:', e);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // Ollama nhận cả mạch hội thoại (system + lịch sử + câu hỏi mới); gateway
    // OpenClaw nhận câu hỏi ở `message` và phần còn lại ở `context`.
    const ollamaMessages = [...context, question];

    // Backend của lượt chat: Ollama (nếu được cấu hình) hoặc gateway OpenClaw.
    // Provider chính thử trước, provider còn lại thử sau nếu có cấu hình — một
    // backend chết không nên làm hỏng lượt chat khi backend kia còn sống.
    const provider = resolveAssistantProvider();
    const attempts = getProviderAttempts(provider);
    let lastError: unknown = null;

    for (const candidate of attempts) {
      try {
        const answer =
          candidate === 'ollama'
            ? await askOllama(ollamaMessages)
            : await askOpenClawGateway(String(message), context);

        return NextResponse.json({
          content: answer.content || 'Xin lỗi, tôi không thể trả lời lúc này.',
          model: answer.model,
          provider: candidate,
          id: Date.now().toString(),
        });
      } catch (apiError) {
        lastError = apiError;
        console.error(`OpenClaw assistant [${candidate}] error:`, apiError);
      }
    }

    // Fallback khi mọi backend ngoại tuyến (chỉ development)
    if (process.env.NODE_ENV === 'development') {
      const researchText = isFlightRelated
        ? `[Coordinator Context: Đã trích xuất thông tin lộ trình Vietjet thực tế]`
        : '';
      return NextResponse.json({
        content: `${researchText} Tôi là trợ lý Vietjet Air. Hệ thống AI hiện đang ngoại tuyến, nhưng tôi đã sẵn sàng hỗ trợ cập nhật chặng bay cho bạn.`,
        model: null,
        provider,
        id: Date.now().toString(),
      });
    }

    throw lastError ?? new Error('No assistant provider responded');
  } catch (error) {
    console.error('OpenClaw Route Error:', error);
    return NextResponse.json(
      { error: getApiErrorMessage(error, 'Internal Server Error') },
      { status: 500 }
    );
  }
}
