/**
 * Coding Pi — tầng provider/service (server) và client stream.
 *
 * Test từng phần sau khi tách cấu trúc API:
 *  - `provider.ts` dịch lỗi của NVIDIA thành HTTP status;
 *  - `service.ts` điều phối một lượt chat (JSON và SSE);
 *  - `features/coding-pi/services` đọc luồng SSE phía trình duyệt.
 *
 * Không gọi NVIDIA thật — `fetch` luôn được bơm.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCodingPiConfig } from '@/lib/coding-pi/config';
import { parseCodingPiRequest } from '@/lib/coding-pi/protocol';
import { CodingPiUpstreamError, describeCodingPiUpstreamFailure } from '@/lib/coding-pi/provider';
import {
  completeCodingPiChat,
  getCodingPiStatusPayload,
  streamCodingPiChat,
} from '@/lib/coding-pi/service';
import { readCodingPiStream } from '@/features/coding-pi/services/codingPiStream';
import { streamCodingPi } from '@/features/coding-pi/services/codingPiService';
import { ApiRequestError } from '@/shared/services';

const config = (overrides: Record<string, string> = {}) =>
  getCodingPiConfig({
    NVIDIA_API_KEY: 'test-key',
    NVIDIA_BASE_URL: 'https://nvidia.test/v1',
    CODING_PI_MODEL: 'nvidia/test-model',
    ...overrides,
  });

const request = (body: Record<string, unknown> = {}) =>
  parseCodingPiRequest({ prompt: 'hi', ...body }, config());

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const sseResponse = (frames: string) =>
  new Response(frames, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dịch lỗi của NVIDIA', () => {
  it('khoá sai thành 502 và nhắc kiểm tra NVIDIA_API_KEY', () => {
    const failure = describeCodingPiUpstreamFailure(
      401,
      JSON.stringify({ error: { message: 'invalid api key' } }),
      'nvidia/test-model'
    );
    expect(failure.status).toBe(502);
    expect(failure.message).toContain('NVIDIA_API_KEY');
  });

  it('sai model thành 502 nêu tên model', () => {
    const failure = describeCodingPiUpstreamFailure(404, '', 'nvidia/test-model');
    expect(failure.status).toBe(502);
    expect(failure.message).toContain('nvidia/test-model');
  });

  it('giới hạn tần suất thành 429, lỗi server thành 502', () => {
    expect(describeCodingPiUpstreamFailure(429, '', 'm').status).toBe(429);
    expect(describeCodingPiUpstreamFailure(503, '', 'm').status).toBe(502);
  });

  it('lỗi 400 của NVIDIA giữ nguyên status và chi tiết', () => {
    const failure = describeCodingPiUpstreamFailure(
      400,
      JSON.stringify({ error: { message: 'temperature out of range' } }),
      'm'
    );
    expect(failure.status).toBe(400);
    expect(failure.message).toBe('temperature out of range');
  });
});

describe('provider: mở request tới NVIDIA', () => {
  it('không kết nối được thì thành 502', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });

    await expect(
      completeCodingPiChat({ request: request(), config: config(), fetchImpl })
    ).rejects.toMatchObject({ status: 502 });
  });

  it('hết thời gian chờ thì thành 504', async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    await expect(
      completeCodingPiChat({
        request: request(),
        config: config({ CODING_PI_TIMEOUT_MS: '20' }),
        fetchImpl,
      })
    ).rejects.toMatchObject({ status: 504 });
  });

  it('client huỷ yêu cầu thì thành 499', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      init?.signal?.throwIfAborted();
      return jsonResponse({});
    });

    await expect(
      completeCodingPiChat({
        request: request(),
        config: config(),
        clientSignal: controller.signal,
        fetchImpl,
      })
    ).rejects.toMatchObject({ status: 499 });
  });
});

describe('service: một lượt chat không stream', () => {
  it('trả về nội dung, reasoning và usage', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        model: 'nvidia/test-model',
        choices: [
          {
            message: { content: 'Xin chào', reasoning_content: 'nghĩ' },
            finish_reason: 'stop',
          },
        ],
        usage: { total_tokens: 7 },
      })
    );

    const result = await completeCodingPiChat({
      request: request({ stream: false }),
      config: config(),
      fetchImpl,
    });

    expect(result).toMatchObject({
      content: 'Xin chào',
      reasoning: 'nghĩ',
      finishReason: 'stop',
      usage: { total_tokens: 7 },
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://nvidia.test/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(String(init.body))).toMatchObject({ stream: false });
  });

  it('phản hồi không phải JSON thì thành 502', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>oops</html>', { status: 200 }));

    await expect(
      completeCodingPiChat({ request: request({ stream: false }), config: config(), fetchImpl })
    ).rejects.toBeInstanceOf(CodingPiUpstreamError);
  });
});

describe('service: một lượt chat dạng stream', () => {
  it('phát ready, reasoning, content rồi done', async () => {
    const frames = [
      'data: {"choices":[{"delta":{"reasoning_content":"nghĩ"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Xin "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"chào"},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');
    const fetchImpl = vi.fn(async () => sseResponse(frames));

    const stream = await streamCodingPiChat({
      request: request(),
      config: config(),
      fetchImpl,
    });
    const text = await new Response(stream).text();

    expect(text).toContain('event: ready');
    expect(text).toContain('event: reasoning');
    expect(text).toContain('event: content');
    expect(text).toContain('event: done');
    expect(text).toContain('"content":"Xin chào"');
  });

  it('không có body thì thành 502', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));

    await expect(
      streamCodingPiChat({ request: request(), config: config(), fetchImpl })
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe('trạng thái cấu hình', () => {
  it('báo provider, model và trạng thái cấu hình', () => {
    const payload = getCodingPiStatusPayload(config(), true);
    expect(payload).toMatchObject({
      provider: 'nvidia',
      configured: true,
      model: 'nvidia/test-model',
      baseUrl: 'https://nvidia.test/v1',
      thinking: true,
    });
  });
});

describe('client: đọc luồng SSE', () => {
  const sseResponse = (frames: string) =>
    new Response(frames, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

  const toStream = (frames: string) => sseResponse(frames).body as ReadableStream<Uint8Array>;

  it('dịch từng event sang dạng có kiểu', async () => {
    const events = [];
    for await (const event of readCodingPiStream(
      toStream(
        [
          'event: ready\ndata: {"model":"nvidia/test-model"}\n\n',
          'event: reasoning\ndata: {"text":"nghĩ"}\n\n',
          'event: content\ndata: {"text":"Xin chào"}\n\n',
          'event: tool_call\ndata: {"id":"c1","function":{"name":"readFile","arguments":"{}"}}\n\n',
          'event: done\ndata: {"content":"Xin chào","reasoning":"nghĩ","toolCalls":[],"finishReason":"stop","usage":null,"model":"nvidia/test-model"}\n\n',
        ].join('')
      )
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'ready',
      'reasoning',
      'content',
      'tool_call',
      'done',
    ]);
    expect(events[0]).toEqual({ type: 'ready', model: 'nvidia/test-model' });
  });

  it('bỏ qua event không đọc được', async () => {
    const events = [];
    for await (const event of readCodingPiStream(
      toStream('event: content\ndata: {không phải JSON}\n\n')
    )) {
      events.push(event);
    }
    expect(events).toEqual([]);
  });

  it('bắn callback theo từng event khi streamCodingPi chạy', async () => {
    const fetchImpl = vi.fn(async () =>
      sseResponse(
        [
          'event: ready\ndata: {"model":"nvidia/test-model"}\n\n',
          'event: content\ndata: {"text":"Xin chào"}\n\n',
          'event: done\ndata: {"content":"Xin chào","reasoning":"","toolCalls":[],"finishReason":"stop","usage":null,"model":"nvidia/test-model"}\n\n',
        ].join('')
      )
    );
    vi.stubGlobal('fetch', fetchImpl);

    const contents: string[] = [];
    const models: string[] = [];
    const result = await streamCodingPi(
      { prompt: 'hi' },
      {
        onReady: (info) => models.push(info.model),
        onContent: (text) => contents.push(text),
      }
    );

    expect(models).toEqual(['nvidia/test-model']);
    expect(contents).toEqual(['Xin chào']);
    expect(result.content).toBe('Xin chào');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/coding-pi/chat');
    expect(init.credentials).toBe('include');
  });

  it('lỗi HTTP trả về ApiRequestError kèm thông điệp của server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ error: 'NVIDIA API đang giới hạn tần suất.' }, 429))
    );

    await expect(streamCodingPi({ prompt: 'hi' })).rejects.toBeInstanceOf(ApiRequestError);
    await expect(streamCodingPi({ prompt: 'hi' })).rejects.toMatchObject({
      status: 429,
      message: 'NVIDIA API đang giới hạn tần suất.',
    });
  });
});
