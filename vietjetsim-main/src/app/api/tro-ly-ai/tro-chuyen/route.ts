import { NextRequest, NextResponse } from 'next/server';
import {
  buildCoordinatorContext,
  parseFlightQuery,
  researchVietjetFlights,
} from '@/lib/openclaw/flight-researcher';
import {
  applyFlightCommand,
  formatCommandConfirmPreview,
  isConfirmationMessage,
  parseFlightCommand,
  setPendingCommand,
  takePendingCommand,
  type UpdatePriceCommand,
  type UpdateTimeCommand,
} from '@/lib/openclaw/flight-command';
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
 */ async function askOpenClawGateway(
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
    const { error, response, payload } = await verifyAdminRequest(req);
    if (error) return response;

    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // ─── OpenClaw Command Lane: lệnh cập nhật đi bằng quy tắc, không qua model ─
    // Lỗi từng thấy ở đường chỉ đọc: quản trị hỏi "cập nhật giá thành 950000"
    // và model trả lời như thể đã có giá 950.000 trong bảng. Đường lệnh giải
    // quyết gốc: parse bằng regex, con số đến từ câu chữ, và chỉ GHI sau khi
    // quản trị trả lời "xác nhận" — model không bao giờ tham gia đường ghi.
    const adminId = String(payload.userId || payload.email || 'admin');
    const commandText = String(message).trim();

    if (isConfirmationMessage(commandText)) {
      const pending = takePendingCommand(adminId);
      if (!pending) {
        return NextResponse.json({
          content:
            'Không có lệnh nào đang chờ xác nhận. Hãy nêu lệnh trước (ví dụ: "cập nhật giá vé VJ 3017 ngày mai phổ thông thành 950000"), rồi hỏi tôi thêm lần nữa.',
          model: null,
          provider: 'openclaw-command',
          id: Date.now().toString(),
        });
      }
      // Sửa quyền chặt bằng cả bảng quyền của lượt XÁC NHẬN, trùng quyền của
      // PATCH /api/quan-tri/chuyen-bay/[id] (flight:price_edit).
      const permission = await verifyAdminRequest(req, 'flight:price_edit');
      if (permission.error || permission.response) return permission.response!;

      try {
        const result = await applyFlightCommand(pending, { adminId });
        if (result.status === 'applied') {
          return NextResponse.json({
            content: `Đã áp dụng lên chuyến ${pending.flightNo}:\n• ${result.changes.join('\n• ')}\n\nKiểm tra lại ở tab Chuyến bay nếu cần.`,
            model: null,
            provider: 'openclaw-command',
            id: Date.now().toString(),
          });
        }
        return NextResponse.json({
          content:
            result.status === 'not-found'
              ? `${result.message}\n${result.nearby.length ? `Các thời điểm gần nhất còn thấy chuyến ${pending.flightNo}: ${result.nearby.map((n) => `${n.date} ${n.time}`).join(', ')}.` : 'Trong ±3 ngày không thấy chuyến nào cùng số hiệu.'}`
              : result.message,
          model: null,
          provider: 'openclaw-command',
          id: Date.now().toString(),
        });
      } catch (applyError) {
        console.error('OpenClaw applyFlightCommand error:', applyError);
        return NextResponse.json(
          { error: getApiErrorMessage(applyError, 'Không áp dụng được lệnh cập nhật chuyến bay.') },
          { status: 500 }
        );
      }
    }

    const command = parseFlightCommand(commandText);
    if (command && command.kind === 'invalid') {
      return NextResponse.json({
        content: `Chưa hiểu lệnh:\n${command.reasons.map((reason) => `• ${reason}`).join('\n')}\n\nHai dạng lệnh hợp lệ:\n• "cập nhật giá vé VJ 3017 ngày 2026-10-19 phổ thông thành 950.000"\n• "đổi giờ bay VJ 3040 ngày mai sang 10:00"`,
        model: null,
        provider: 'openclaw-command',
        id: Date.now().toString(),
      });
    }

    if (command && (command.kind === 'update-price' || command.kind === 'update-time')) {
      // Quyền chặt kiểm từ lượt đề xuất luôn: một role không có quyền sửa giá
      // không cần thấy preview rồi mới bị chặn ở lượt xác nhận.
      const permission = await verifyAdminRequest(req, 'flight:price_edit');
      if (permission.error || permission.response) return permission.response!;

      setPendingCommand(adminId, command as UpdatePriceCommand | UpdateTimeCommand);
      return NextResponse.json({
        content: `Sẵn sàng thay đổi (chưa ghi):\n• ${formatCommandConfirmPreview(command as UpdatePriceCommand | UpdateTimeCommand)}\n\nTrả lời "xác nhận" để áp dụng. Lệnh chờ hết hạn sau 5 phút.`,
        model: null,
        provider: 'openclaw-command',
        id: Date.now().toString(),
      });
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // ─── OpenClaw Role Enforcement: COORDINATOR (Real-Time Flight Updates ONLY) ─
    const coordinatorSystem: AssistantMessage = {
      role: 'system',
      content: `Bạn là OpenClaw Coordinator. 
CHỨC NĂNG DUY NHẤT: Tra cứu và cập nhật chuyến bay, giá vé, giờ bay, chặng bay đang bán trong cơ sở dữ liệu của hệ thống cho quản trị viên.
QUY TẮC: 
1. Chỉ trả lời các vấn đề liên quan đến chuyến bay, giá vé, giờ bay, chặng bay và việc cập nhật thông tin chuyến bay vào admin dashboard.
2. Từ chối lịch sự mọi câu hỏi về eSIM, gói cước, hoặc hỗ trợ khách hàng chung.
3. Khi hệ thống cung cấp phần dữ liệu chuyến bay ngay sau đây, chỉ được dùng số liệu trong đó — tuyệt đối không bịa số hiệu, giờ bay, giá hay chặng. Nếu hệ thống không có chuyến cho ngày được hỏi thì nói rõ là không có và gợi ý ngày gần nhất.
4. Luôn kèm link tra cứu trên VietjetAir.
5. Bạn KHÔNG tự sửa dữ liệu. Việc thay đổi giá/giờ chỉ diễn ra khi quản trị gõ đúng mẫu lệnh (vd "cập nhật giá vé VJ 3017 ngày 2026-10-19 phổ thông thành 950.000" hoặc "đổi giờ bay VJ 3040 ngày mai sang 10:00") và hệ thống chờ chữ "xác nhận". Khi người dùng nêu ý cập nhật ở dạng tự do, hãy chỉ dẫn cách viết lệnh theo mẫu trên và TUYỆT ĐỐI không khẳng định "đã cập nhật" hay lấy số họ vừa gõ trình bày như số hiện tại trong bảng.`,
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
      // Chặng và ngày lấy từ câu hỏi; không có ngày thì là hôm nay giờ Việt Nam
      // (xem `parseFlightDate` — "hôm nay" theo UTC sẽ lùi một ngày từ 00:00 tới
      // 07:00 giờ VN và link tra cứu mở sai ngày).
      const { origin, destination, date } = parseFlightQuery(String(message));
      try {
        const research = await researchVietjetFlights(origin, destination, date);
        context.push({ role: 'system', content: buildCoordinatorContext(research) });
      } catch (e) {
        console.error('Coordinator research failed:', e);
        context.push({
          role: 'system',
          content: `KHÔNG truy vấn được dữ liệu chuyến bay ${origin}-${destination} (${date}) từ cơ sở dữ liệu. Phải nói với người dùng là chưa tra được; tuyệt đối không bịa số hiệu, giờ bay hay giá.`,
        });
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
