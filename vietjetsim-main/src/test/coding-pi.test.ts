/**
 * Coding Pi — provider NVIDIA NIM trong `/api/coding-pi/chat`.
 *
 * Test thuần cho phần dựng payload/đọc SSE, và test route bằng `NextRequest`
 * thật với `fetch` được thay bằng stream giả. Không gọi NVIDIA thật.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import {
  buildCodingPiMessages,
  buildCodingPiPayload,
  CodingPiValidationError,
  createCodingPiAccumulator,
  createCodingPiSseParser,
  encodeCodingPiSseEvent,
  normalizeCodingPiMessages,
  parseCodingPiCompletion,
  parseCodingPiRequest,
  parseCodingPiStreamData,
} from '@/lib/coding-pi/protocol';
import {
  DEFAULT_CODING_PI_MAX_TOKENS,
  DEFAULT_CODING_PI_MODEL,
  DEFAULT_CODING_PI_TIMEOUT_MS,
  DEFAULT_NVIDIA_BASE_URL,
  getCodingPiConfig,
  isCodingPiConfigured,
  normalizeNvidiaBaseUrl,
} from '@/lib/coding-pi/config';
import { GET as getStatus, POST as postChat } from '@/app/api/coding-pi/chat/route';

vi.mock('@/lib/neon', () => {
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([]), {
    query: vi.fn().mockResolvedValue([]),
  });
  return { sql: sqlMock };
});

vi.mock('@/lib/role-permissions', () => ({
  getRolePermissionsFromDb: vi.fn(async () => new Set(['system:config'])),
  bypassesPermissionTable: () => false,
}));

const CSRF_TOKEN = 'coding-pi-csrf-token';

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

const chatUrl = 'http://localhost:4028/api/coding-pi/chat';

const chatRequest = (body: unknown) =>
  new NextRequest(chatUrl, {
    method: 'POST',
    headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv('NVIDIA_API_KEY', 'test-nvidia-key');
  vi.stubEnv('NVIDIA_BASE_URL', 'https://nvidia.test/v1');
  vi.stubEnv('CODING_PI_MODEL', 'nvidia/test-model');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('cấu hình Coding Pi', () => {
  it('dùng mặc định đúng của NVIDIA NIM', () => {
    expect(getCodingPiConfig({})).toEqual({
      apiKey: '',
      baseUrl: DEFAULT_NVIDIA_BASE_URL,
      model: DEFAULT_CODING_PI_MODEL,
      maxTokens: DEFAULT_CODING_PI_MAX_TOKENS,
      temperature: 1,
      topP: 0.95,
      seed: 42,
      enableThinking: true,
      timeoutMs: DEFAULT_CODING_PI_TIMEOUT_MS,
    });
  });

  it('đọc được biến môi trường và chuẩn hoá base URL', () => {
    const config = getCodingPiConfig({
      NVIDIA_API_KEY: ' key ',
      NVIDIA_BASE_URL: 'nv.example/v1/chat/completions',
      CODING_PI_MODEL: 'nvidia/custom',
      CODING_PI_MAX_TOKENS: '2048',
      CODING_PI_TEMPERATURE: '0.2',
      CODING_PI_TOP_P: '0.8',
      CODING_PI_SEED: '7',
      CODING_PI_THINKING: 'false',
      CODING_PI_TIMEOUT_MS: '120000',
    });

    expect(config.apiKey).toBe('key');
    expect(config.baseUrl).toBe('https://nv.example/v1');
    expect(config.model).toBe('nvidia/custom');
    expect(config.maxTokens).toBe(2048);
    expect(config.temperature).toBe(0.2);
    expect(config.topP).toBe(0.8);
    expect(config.seed).toBe(7);
    expect(config.enableThinking).toBe(false);
    expect(config.timeoutMs).toBe(120_000);
  });

  it('chỉ coi là đã cấu hình khi có khoá', () => {
    expect(isCodingPiConfigured({})).toBe(false);
    expect(isCodingPiConfigured({ NVIDIA_API_KEY: 'x' })).toBe(true);
    expect(normalizeNvidiaBaseUrl('')).toBe(DEFAULT_NVIDIA_BASE_URL);
  });
});

describe('dựng messages', () => {
  it('ghép prompt + context + history, system prompt đứng đầu', () => {
    const messages = buildCodingPiMessages({
      prompt: 'Sửa lỗi TypeScript',
      context: 'export const x = 1;',
      history: [{ role: 'assistant', content: 'Được.' }],
    });

    expect(messages[0].role).toBe('system');
    expect(messages).toHaveLength(3);
    expect(messages[1]).toEqual({ role: 'assistant', content: 'Được.' });
    expect(messages[2].content).toContain('<file>');
    expect(messages[2].content).toContain('export const x = 1;');
  });

  it('thêm ảnh vào lượt user cuối và giới hạn 4 ảnh', () => {
    const messages = buildCodingPiMessages({
      prompt: 'Đọc ảnh này',
      images: Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.png`),
    });
    const content = messages[messages.length - 1].content;
    expect(Array.isArray(content)).toBe(true);
    if (Array.isArray(content)) {
      expect(content.filter((part) => part.type === 'image_url')).toHaveLength(4);
    }
  });

  it('nhận messages đầy đủ kèm tool result', () => {
    const messages = normalizeCodingPiMessages([
      { role: 'system', content: 'Bạn là trợ lý.' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'readFile', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'call_1', content: 'nội dung' },
      { role: 'user', content: [{ type: 'text', text: 'tiếp tục' }] },
    ]);

    expect(messages).toHaveLength(4);
    expect(messages[2]).toMatchObject({ role: 'tool', tool_call_id: 'call_1' });
  });
});

describe('kiểm tra request', () => {
  it('từ chối prompt rỗng', () => {
    expect(() => parseCodingPiRequest({}, getCodingPiConfig({}))).toThrow(CodingPiValidationError);
  });

  it('từ chối maxTokens ngoài biên', () => {
    expect(() =>
      parseCodingPiRequest({ prompt: 'hi', maxTokens: 99_999 }, getCodingPiConfig({}))
    ).toThrow(/maxTokens/);
  });

  it('dựng payload đúng shape NVIDIA, gồm thinking và tool', () => {
    const config = getCodingPiConfig({
      NVIDIA_API_KEY: 'k',
      CODING_PI_MODEL: 'nvidia/test',
    });
    const request = parseCodingPiRequest(
      {
        prompt: 'Tìm file',
        model: 'nvidia/manual',
        tools: [
          {
            type: 'function',
            function: {
              name: 'readFile',
              description: 'Đọc tệp',
              parameters: { type: 'object', properties: { path: { type: 'string' } } },
            },
          },
        ],
        toolChoice: 'auto',
      },
      config
    );
    const payload = buildCodingPiPayload(request);

    expect(payload).toMatchObject({
      model: 'nvidia/manual',
      stream: true,
      temperature: 1,
      top_p: 0.95,
      max_tokens: DEFAULT_CODING_PI_MAX_TOKENS,
      seed: 42,
      parallel_tool_calls: true,
      chat_template_kwargs: { enable_thinking: true },
      tool_choice: 'auto',
    });
    expect(payload.tools?.[0].function.name).toBe('readFile');
  });
});

describe('SSE và stream', () => {
  it('ghép khối bị chia cắt giữa hai chunk', () => {
    const parser = createCodingPiSseParser();
    expect(parser.push('event: content\nda')).toEqual([]);
    expect(parser.push('ta: {"text":"hi"}\n\n')).toEqual([
      { event: 'content', data: '{"text":"hi"}' },
    ]);
  });

  it('đọc được reasoning_content, content và tool_calls', () => {
    const reasoning = parseCodingPiStreamData(
      JSON.stringify({ choices: [{ delta: { reasoning_content: 'nghĩ' } }] })
    );
    expect(reasoning?.reasoning).toBe('nghĩ');

    const tool = parseCodingPiStreamData(
      JSON.stringify({
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: 'call_1', function: { name: 'readFile', arguments: '{"pa' } },
              ],
            },
          },
        ],
      })
    );
    expect(tool?.toolCalls[0]).toMatchObject({
      id: 'call_1',
      function: { name: 'readFile', arguments: '{"pa' },
    });
  });

  it('cộng dồn tool arguments qua nhiều delta', () => {
    const accumulator = createCodingPiAccumulator();
    accumulator.add(
      parseCodingPiStreamData(
        JSON.stringify({
          choices: [{ delta: { tool_calls: [{ index: 0, id: 'c', function: { name: 'read' } }] } }],
        })
      )!
    );
    accumulator.add(
      parseCodingPiStreamData(
        JSON.stringify({
          choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"path":' } }] } }],
        })
      )!
    );
    accumulator.add(
      parseCodingPiStreamData(
        JSON.stringify({
          choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"a.ts"}' } }] } }],
        })
      )!
    );

    expect(accumulator.result().toolCalls[0].function).toEqual({
      name: 'read',
      arguments: '{"path":"a.ts"}',
    });
  });

  it('phát frame SSE đúng định dạng', () => {
    expect(encodeCodingPiSseEvent('content', { text: 'a\nb' })).toBe(
      'event: content\ndata: {"text":"a\\nb"}\n\n'
    );
  });

  it('đọc phản hồi không stream', () => {
    const result = parseCodingPiCompletion({
      model: 'nvidia/x',
      choices: [
        {
          message: {
            content: 'Xin chào',
            reasoning_content: 'suy nghĩ',
            tool_calls: [{ id: 'c', function: { name: 'f', arguments: '{}' } }],
          },
          finish_reason: 'stop',
        },
      ],
      usage: { total_tokens: 3 },
    });

    expect(result).toMatchObject({
      content: 'Xin chào',
      reasoning: 'suy nghĩ',
      finishReason: 'stop',
      model: 'nvidia/x',
      toolCalls: [{ id: 'c', function: { name: 'f', arguments: '{}' } }],
    });
  });
});

describe('POST /api/coding-pi/chat', () => {
  it('trả 401 khi chưa đăng nhập', async () => {
    const res = await postChat(
      new NextRequest(chatUrl, { method: 'POST', body: JSON.stringify({ prompt: 'hi' }) })
    );
    expect(res.status).toBe(401);
  });

  it('trả 503 khi chưa cấu hình khoá', async () => {
    vi.stubEnv('NVIDIA_API_KEY', '');
    const res = await postChat(chatRequest({ prompt: 'hi' }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('NVIDIA_API_KEY'),
    });
  });

  it('trả 400 khi thiếu prompt', async () => {
    const res = await postChat(chatRequest({}));
    expect(res.status).toBe(400);
  });

  it('trả JSON khi stream:false', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            model: 'nvidia/test-model',
            choices: [
              {
                message: { content: 'Xin chào', reasoning_content: 'nghĩ' },
                finish_reason: 'stop',
              },
            ],
            usage: { total_tokens: 5 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await postChat(chatRequest({ prompt: 'hi', stream: false }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toMatchObject({
      provider: 'nvidia',
      content: 'Xin chào',
      reasoning: 'nghĩ',
      finishReason: 'stop',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://nvidia.test/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-nvidia-key');
    const payload = JSON.parse(String(init.body));
    expect(payload).toMatchObject({
      model: 'nvidia/test-model',
      stream: false,
      parallel_tool_calls: true,
      chat_template_kwargs: { enable_thinking: true },
    });
  });

  it('stream mặc định: phát reasoning, content và done', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"nghĩ"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Xin "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"chào"},"finish_reason":"stop"}],"usage":{"total_tokens":5}}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      )
    );

    const res = await postChat(chatRequest({ prompt: 'hi' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const text = await res.text();
    expect(text).toContain('event: ready');
    expect(text).toContain('event: reasoning');
    expect(text).toContain('"text":"nghĩ"');
    expect(text).toContain('event: content');
    expect(text).toContain('"text":"Xin "');

    const doneBlock = text.split('\n\n').find((block) => block.startsWith('event: done'));
    expect(doneBlock).toBeTruthy();
    const doneData = doneBlock!
      .split('\n')
      .find((line) => line.startsWith('data: '))!
      .slice('data: '.length);
    expect(JSON.parse(doneData)).toMatchObject({
      content: 'Xin chào',
      reasoning: 'nghĩ',
      finishReason: 'stop',
      usage: { total_tokens: 5 },
    });
  });

  it('đổi lỗi xác thực của NVIDIA thành 502', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: 'invalid api key' } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );

    const res = await postChat(chatRequest({ prompt: 'hi' }));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('NVIDIA_API_KEY'),
    });
  });
});

describe('GET /api/coding-pi/chat', () => {
  it('báo trạng thái cấu hình cho admin', async () => {
    const res = await getStatus(new NextRequest(chatUrl, { headers: adminHeaders() }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      provider: 'nvidia',
      configured: true,
      model: 'nvidia/test-model',
      baseUrl: 'https://nvidia.test/v1',
    });
  });
});
