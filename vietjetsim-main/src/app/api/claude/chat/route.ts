import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_MODEL = 'claude-3-5-sonnet-latest';
const MAX_HISTORY_ITEMS = 20;
const MAX_CONTEXT_LENGTH = 120_000;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessage>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  );
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chưa cấu hình ANTHROPIC_API_KEY trên máy chủ.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const context = typeof body.context === 'string' ? body.context : '';
    const history = Array.isArray(body.history)
      ? body.history.filter(isChatMessage).slice(-MAX_HISTORY_ITEMS)
      : [];

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt là bắt buộc.' }, { status: 400 });
    }

    const contextBlock = context.slice(0, MAX_CONTEXT_LENGTH);
    const messages: ChatMessage[] = [
      ...history,
      {
        role: 'user',
        content: contextBlock
          ? `${prompt}\n\nNội dung tệp đang mở:\n\n<file>\n${contextBlock}\n</file>`
          : prompt,
      },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 4096,
        system:
          'Bạn là Claude hỗ trợ lập trình trong VS Code Web Studio. Trả lời bằng tiếng Việt, ưu tiên phân tích chính xác và đưa ra các thay đổi code ngắn gọn, có thể áp dụng. Không tự nhận đã sửa file nếu chưa được yêu cầu.',
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic API Error:', data);
      return NextResponse.json(
        { error: data?.error?.message || `Claude API trả về mã ${response.status}.` },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const content = Array.isArray(data.content)
      ? data.content
          .filter((block: { type?: string; text?: string }) => block.type === 'text')
          .map((block: { text?: string }) => block.text || '')
          .join('\n')
          .trim()
      : '';

    return NextResponse.json({ content, model: data.model });
  } catch (error) {
    console.error('Claude chat route error:', error);
    return NextResponse.json({ error: 'Không thể kết nối tới Claude API.' }, { status: 500 });
  }
}
