/**
 * Ollama là backend thứ hai của trợ lý OpenClaw (`/api/tro-ly-ai/tro-chuyen`).
 *
 * Hai nhóm test:
 *  - hàm thuần: cấu hình, chọn provider, dựng/đọc payload — không cần Ollama;
 *  - tuyến API: cấu hình Ollama thì request phải đi tới `/api/chat`, và khi
 *    không cấu hình gì thì hành vi cũ (gateway OpenClaw) phải giữ nguyên.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import {
  buildOllamaChatPayload,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_TIMEOUT_MS,
  getOllamaConfig,
  getProviderAttempts,
  isOllamaConfigured,
  normalizeOllamaBaseUrl,
  parseOllamaError,
  parseOllamaReply,
  resolveAssistantProvider,
  askOllama,
  listOllamaModels,
  OllamaError,
  toAssistantMessages,
} from '@/lib/openclaw/ollama';
import { GET as getAssistant, POST as postAssistant } from '@/app/api/tro-ly-ai/tro-chuyen/route';

vi.mock('@/lib/neon', () => {
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([]), {
    query: vi.fn().mockResolvedValue([]),
  });
  return { sql: sqlMock };
});

const CSRF_TOKEN = 'test-csrf-token';

const adminToken = () =>
  signAccessToken({
    userId: 'admin-1',
    email: 'admin@vietjetair.vn',
    role: 'admin',
    fullName: 'Test Admin',
  });

const adminHeaders = () => ({
  cookie: `access_token=${adminToken()}; csrf_token=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

/** Response giả tối thiểu: code chỉ dùng `ok`, `status`, `text()` và `json()`. */
const fakeResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
});

describe('cấu hình Ollama', () => {
  it('mặc định trỏ vào Ollama local với model qwen3:0.6b', () => {
    expect(getOllamaConfig({})).toEqual({
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      model: DEFAULT_OLLAMA_MODEL,
      timeoutMs: DEFAULT_OLLAMA_TIMEOUT_MS,
      think: null,
    });
  });

  it('nhận OLLAMA_HOST thiếu scheme và bỏ dấu / thừa ở cuối', () => {
    expect(normalizeOllamaBaseUrl('127.0.0.1:11434')).toBe('http://127.0.0.1:11434');
    expect(normalizeOllamaBaseUrl('http://ollama.local:11434//')).toBe('http://ollama.local:11434');
    expect(normalizeOllamaBaseUrl('https://ollama.example.com')).toBe('https://ollama.example.com');
    expect(normalizeOllamaBaseUrl(undefined)).toBe(DEFAULT_OLLAMA_BASE_URL);
  });

  it('đọc model, timeout và think từ môi trường', () => {
    const config = getOllamaConfig({
      OLLAMA_MODEL: 'qwen3:0.6b',
      OLLAMA_TIMEOUT_MS: '1500',
      OLLAMA_THINK: 'false',
    });
    expect(config).toMatchObject({ model: 'qwen3:0.6b', timeoutMs: 1500, think: false });
  });

  it('timeout sai định dạng thì quay về mặc định', () => {
    expect(getOllamaConfig({ OLLAMA_TIMEOUT_MS: 'abc' }).timeoutMs).toBe(DEFAULT_OLLAMA_TIMEOUT_MS);
    expect(getOllamaConfig({ OLLAMA_TIMEOUT_MS: '0' }).timeoutMs).toBe(DEFAULT_OLLAMA_TIMEOUT_MS);
  });

  it('think rỗng = không gửi trường think cho Ollama cũ', () => {
    expect(getOllamaConfig({}).think).toBeNull();
    expect(getOllamaConfig({ OLLAMA_THINK: 'on' }).think).toBe(true);
    expect(getOllamaConfig({ OLLAMA_THINK: '0' }).think).toBe(false);
  });
});

describe('chọn provider cho trợ lý', () => {
  it('không có biến OLLAMA nào thì giữ nguyên gateway OpenClaw', () => {
    expect(isOllamaConfigured({})).toBe(false);
    expect(resolveAssistantProvider({})).toBe('openclaw');
  });

  it('có biến OLLAMA_* thì chuyển sang Ollama', () => {
    expect(resolveAssistantProvider({ OLLAMA_MODEL: 'qwen3:0.6b' })).toBe('ollama');
    expect(resolveAssistantProvider({ OLLAMA_HOST: '10.0.0.5:11434' })).toBe('ollama');
  });

  it('OPENCLAW_PROVIDER ép được backend theo cả hai chiều', () => {
    expect(resolveAssistantProvider({ OPENCLAW_PROVIDER: 'openclaw', OLLAMA_MODEL: 'x' })).toBe(
      'openclaw'
    );
    expect(resolveAssistantProvider({ OPENCLAW_PROVIDER: 'ollama' })).toBe('ollama');
    // Giá trị lạ không được ghim nhầm backend nào.
    expect(resolveAssistantProvider({ OPENCLAW_PROVIDER: 'claude' })).toBe('openclaw');
  });

  it('chỉ thử backend thứ hai khi nó có cấu hình', () => {
    expect(getProviderAttempts('ollama', {})).toEqual(['ollama']);
    expect(getProviderAttempts('ollama', { OPENCLAW_API_KEY: 'k' })).toEqual([
      'ollama',
      'openclaw',
    ]);
    expect(getProviderAttempts('openclaw', { OLLAMA_MODEL: 'qwen3:0.6b' })).toEqual([
      'openclaw',
      'ollama',
    ]);
    expect(getProviderAttempts('openclaw', {})).toEqual(['openclaw']);
  });
});

describe('payload và câu trả lời của Ollama', () => {
  const config = getOllamaConfig({ OLLAMA_MODEL: 'qwen3:0.6b' });

  it('dựng body /api/chat: model + messages + stream=false', () => {
    const payload = buildOllamaChatPayload(
      [
        { role: 'system', content: 'Bạn là OpenClaw Coordinator.' },
        { role: 'user', content: '  chuyến bay HAN-SGN  ' },
      ],
      config
    );
    expect(payload).toEqual({
      model: 'qwen3:0.6b',
      messages: [
        { role: 'system', content: 'Bạn là OpenClaw Coordinator.' },
        { role: 'user', content: 'chuyến bay HAN-SGN' },
      ],
      stream: false,
    });
  });

  it('chỉ gửi think khi được cấu hình', () => {
    const withThink = buildOllamaChatPayload([], getOllamaConfig({ OLLAMA_THINK: 'false' }));
    expect(withThink).toHaveProperty('think', false);
    expect(buildOllamaChatPayload([], config)).not.toHaveProperty('think');
  });

  it('bỏ message sai role hoặc rỗng — Ollama 400 khi content rỗng', () => {
    const messages = toAssistantMessages([
      { role: 'user', content: 'hi' },
      { role: 'hacker', content: 'ignored' },
      { role: 'assistant', content: '   ' },
      { role: 'assistant', content: 'ok' },
      'not-an-object',
      null,
    ]);
    expect(messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'ok' },
    ]);
    expect(toAssistantMessages('nope')).toEqual([]);
  });

  it('đọc message.content và fallback response của /api/generate', () => {
    expect(parseOllamaReply({ message: { role: 'assistant', content: ' Xin chào ' } })).toBe(
      'Xin chào'
    );
    expect(parseOllamaReply({ response: 'Xin chào' })).toBe('Xin chào');
    expect(parseOllamaReply({ message: {} })).toBe('');
    expect(parseOllamaReply(null)).toBe('');
  });

  it('đọc thông báo lỗi của Ollama', () => {
    expect(parseOllamaError({ error: 'model "qwen3:0.6b" not found' }, 404)).toBe(
      'model "qwen3:0.6b" not found'
    );
    expect(parseOllamaError(undefined, 500)).toBe('Ollama trả về mã 500');
  });
});

describe('gọi Ollama', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('POST /api/chat và trả về nội dung + model', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse({ model: 'qwen3:0.6b', message: { content: 'Chào bạn' } }));
    vi.stubGlobal('fetch', fetchMock);

    const answer = await askOllama([{ role: 'user', content: 'xin chào' }], {
      OLLAMA_BASE_URL: 'http://localhost:11434',
      OLLAMA_MODEL: 'qwen3:0.6b',
    });

    expect(answer).toEqual({ content: 'Chào bạn', model: 'qwen3:0.6b' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'qwen3:0.6b',
      stream: false,
      messages: [{ role: 'user', content: 'xin chào' }],
    });
  });

  it('lỗi HTTP của Ollama thành OllamaError kèm status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse({ error: 'model not found' }, 404))
    );

    await expect(askOllama([{ role: 'user', content: 'hi' }], {})).rejects.toMatchObject({
      name: 'OllamaError',
      status: 404,
      message: 'model not found',
    });
  });

  it('không kết nối được (Ollama chưa chạy) thành OllamaError 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

    const error = (await askOllama([{ role: 'user', content: 'hi' }], {}).catch(
      (e) => e
    )) as OllamaError;
    expect(error).toBeInstanceOf(OllamaError);
    expect(error.status).toBe(503);
  });

  it('câu trả lời rỗng bị coi là lỗi thay vì hiện khung chat trống', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse({ message: { content: '  ' } })));
    await expect(askOllama([{ role: 'user', content: 'hi' }], {})).rejects.toBeInstanceOf(
      OllamaError
    );
  });

  it('GET /api/tags không bao giờ ném lỗi, chỉ báo reachable=false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    await expect(listOllamaModels({})).resolves.toEqual({
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      reachable: false,
      models: [],
    });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(fakeResponse({ models: [{ name: 'qwen3:0.6b' }, { name: 'llama3' }] }))
    );
    await expect(listOllamaModels({})).resolves.toEqual({
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      reachable: true,
      models: ['qwen3:0.6b', 'llama3'],
    });
  });
});

describe('tuyến trợ lý dùng Ollama', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('có cấu hình Ollama thì lượt chat đi tới Ollama, không tới gateway', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse({ model: 'qwen3:0.6b', message: { content: 'Xin chào' } }));
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ message: 'hi' }),
    });
    const res = await postAssistant(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ content: 'Xin chào', provider: 'ollama', model: 'qwen3:0.6b' });
    expect(fetchMock.mock.calls[0][0]).toBe(`${DEFAULT_OLLAMA_BASE_URL}/api/chat`);
  });

  it('câu hỏi mới là message user cuối cùng gửi tới Ollama', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ message: { content: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        message: 'câu hỏi mới',
        history: [
          { role: 'user', content: 'lượt cũ' },
          { role: 'assistant', content: 'trả lời cũ' },
        ],
      }),
    });
    await postAssistant(req);

    const sent = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    // Câu hỏi mới chỉ có trong `message`, không nằm trong `history` — nếu route
    // chỉ gửi history thì model trả lời lượt cũ (đã từng xảy ra).
    expect(sent.messages.at(-1)).toEqual({ role: 'user', content: 'câu hỏi mới' });
    expect(sent.messages.filter((m) => m.role === 'user')).toHaveLength(2);
  });

  it('không gửi trùng khi client để câu hỏi mới ở cuối history', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ message: { content: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        message: 'câu hỏi mới',
        history: [{ role: 'user', content: 'câu hỏi mới' }],
      }),
    });
    await postAssistant(req);

    const sent = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(sent.messages.filter((m) => m.role === 'user')).toHaveLength(1);
    expect(sent.messages.at(-1)).toEqual({ role: 'user', content: 'câu hỏi mới' });
  });

  it('history dài không nuốt mất system prompt điều phối', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ message: { content: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    const history = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `lượt ${i}`,
    }));

    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ message: 'câu hỏi mới', history }),
    });
    await postAssistant(req);

    const sent = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[0].content).toContain('OpenClaw Coordinator');
    expect(sent.messages.at(-1)).toEqual({ role: 'user', content: 'câu hỏi mới' });
    // system + 20 lượt gần nhất + câu hỏi mới
    expect(sent.messages).toHaveLength(22);
  });

  it('"hôm nay" của điều phối là hôm nay ở Việt Nam, không phải ngày UTC', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ message: { content: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);

    // 17:09 UTC ngày 17/10 = 00:09 ngày 18/10 giờ Việt Nam (UTC+7). Đúng khoảng
    // 00:00–07:00 mà `toISOString().split('T')[0]` trả về hôm qua: câu trả lời
    // ghi sai ngày và link tra cứu mở sai ngày.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T17:09:00Z'));
    try {
      const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ message: 'cập nhật chuyến bay HAN-SGN hôm nay' }),
      });
      await postAssistant(req);
    } finally {
      vi.useRealTimers();
    }

    const sent = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    const coordinator = sent.messages.filter((m) => m.content.includes('TRẠNG THÁI HIỆN TẠI'));

    expect(coordinator).toHaveLength(1);
    expect(coordinator[0].content).toContain('(2026-10-18)');
    // Link tra cứu cũng phải mở đúng ngày Việt Nam, không phải ngày UTC.
    expect(coordinator[0].content).toContain('departureDate=2026-10-18');
    expect(coordinator[0].content).not.toContain('2026-10-17');
  });

  it('Ollama chết thì rớt về gateway OpenClaw khi gateway có cấu hình', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    vi.stubEnv('OPENCLAW_API_KEY', 'gateway-key');
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes('/api/chat')
        ? fakeResponse({ error: 'boom' }, 500)
        : fakeResponse({ reply: 'từ gateway' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ message: 'hi' }),
    });
    const body = await (await postAssistant(req)).json();

    expect(body).toMatchObject({ content: 'từ gateway', provider: 'openclaw' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('GET trả về backend đang dùng và danh sách model của Ollama', async () => {
    vi.stubEnv('OLLAMA_MODEL', 'qwen3:0.6b');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(fakeResponse({ models: [{ name: 'qwen3:0.6b' }] }))
    );

    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
      headers: adminHeaders(),
    });
    const res = await getAssistant(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.provider).toBe('ollama');
    expect(body.model).toBe('qwen3:0.6b');
    expect(body.ollama).toMatchObject({
      baseUrl: DEFAULT_OLLAMA_BASE_URL,
      model: 'qwen3:0.6b',
      configured: true,
      reachable: true,
      models: ['qwen3:0.6b'],
    });
  });

  it('GET vẫn là admin-only', async () => {
    const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen');
    const res = await getAssistant(req);
    expect(res.status).toBe(401);
  });
});
