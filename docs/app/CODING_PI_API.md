# Coding Pi API

Coding Pi là trợ lý lập trình trong `/editor`, chạy trên NVIDIA NIM với model
`nvidia/nemotron-3.5-super-vl-120b-a12b` (hỗ trợ ảnh, `reasoning_content` và
tool calling). Khoá NVIDIA chỉ nằm ở server; trình duyệt không bao giờ nhận
được khoá.

## Cấu trúc

API chia làm ba tầng: **protocol** (hợp đồng dữ liệu, thuần), **provider +
service** (server-only, chạm vào khoá) và **feature** (client trong trình
duyệt).

| Tệp                                                                   | Vai trò                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `vietjetsim-main/src/lib/coding-pi/config.ts`                         | Đọc biến môi trường, chuẩn hoá base URL. **Server-only.**    |
| `vietjetsim-main/src/lib/coding-pi/protocol.ts`                       | Kiểu dữ liệu, kiểm tra body, dựng payload. Thuần.            |
| `vietjetsim-main/src/lib/coding-pi/stream.ts`                         | Parser/encoder SSE, cộng dồn delta, tên event. Thuần.         |
| `vietjetsim-main/src/lib/coding-pi/provider.ts`                       | Gọi NVIDIA NIM, timeout, dịch lỗi upstream thành HTTP status.|
| `vietjetsim-main/src/lib/coding-pi/service.ts`                        | Điều phối một lượt chat (JSON hoặc SSE). **Server-only.**     |
| `vietjetsim-main/src/app/api/coding-pi/chat/route.ts`                 | `GET` trạng thái, `POST` chat — chỉ xác thực và gọi service. |
| `vietjetsim-main/src/features/coding-pi/constants.ts`                 | Endpoint dùng chung.                                          |
| `vietjetsim-main/src/features/coding-pi/types/index.ts`               | Kiểu dùng chung cho client.                                   |
| `vietjetsim-main/src/features/coding-pi/services/codingPiStream.ts`   | Đọc SSE thành event có kiểu.                                  |
| `vietjetsim-main/src/features/coding-pi/services/codingPiService.ts`  | Client SSE/JSON cho UI.                                       |
| `vietjetsim-main/src/app/editor/page.tsx`                             | Panel “Coding Pi” trong editor.                               |
| `vietjetsim-main/src/test/coding-pi.test.ts`                          | Test thuần + route với `fetch` giả.                          |
| `vietjetsim-main/src/test/coding-pi-service.test.ts`                  | Test provider/service/client stream.                          |
| `vietjetsim-main/src/test/coding-pi-isolation.test.ts`                | Test khoá không lọt vào bundle trình duyệt.                   |

**Quy tắc phân tầng:** `protocol.ts` và `stream.ts` không đọc `process.env` nên
client import được mà không kéo theo khoá. `config.ts`, `provider.ts`,
`service.ts` và barrel `src/lib/coding-pi/index.ts` là server-only —
`src/test/coding-pi-isolation.test.ts` quét toàn bộ `src/features`, `src/shared`
và `src/app` (trừ `src/app/api`) để chắc chắn không tệp client nào import
tầng đó.

**Luồng xử lý một request `POST`:**

```text
route.ts        verifyAdminRequest → parseCodingPiRequest
   └─ service.ts   completeCodingPiChat | streamCodingPiChat
        └─ provider.ts   openCodingPiUpstream (timeout, huỷ, dịch lỗi)
             └─ NVIDIA NIM  POST {baseUrl}/chat/completions
```

Route chỉ làm phần HTTP. Mọi thứ liên quan tới NVIDIA — timeout, huỷ, đọc
stream, ghép event — nằm ở `service.ts`/`provider.ts` nên test được mà không
cần dựng HTTP server.

## Biến môi trường

```dotenv
NVIDIA_API_KEY=nvapi-...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
CODING_PI_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
CODING_PI_MAX_TOKENS=16384
# CODING_PI_TEMPERATURE=1
# CODING_PI_TOP_P=0.95
# CODING_PI_SEED=42
# CODING_PI_THINKING=true
# CODING_PI_TIMEOUT_MS=300000
```

`NVIDIA_API_KEY` là bắt buộc. Không có khoá ⇒ `POST` trả `503` và editor báo
“Chưa cấu hình NVIDIA_API_KEY”. Không dùng tiền tố `NEXT_PUBLIC_`.

## GET /api/coding-pi/chat

Admin-only. Trả trạng thái backend để editor biết có gọi được không:

```json
{
  "provider": "nvidia",
  "configured": true,
  "model": "nvidia/nemotron-3.5-super-vl-120b-a12b",
  "baseUrl": "https://integrate.api.nvidia.com/v1",
  "maxTokens": 16384,
  "temperature": 1,
  "topP": 0.95,
  "thinking": true,
  "timeoutMs": 300000
}
```

## POST /api/coding-pi/chat

Admin-only, yêu cầu CSRF như mọi route ghi khác. Hai cách gửi nội dung:

- `prompt` + `context` + `history` — giống `/api/claude/chat`, dùng cho editor;
- `messages` — mảng OpenAI đầy đủ (`system`/`user`/`assistant`/`tool`), dùng
  cho API consumer hoặc vòng lặp tool calling.

### Request

```json
{
  "prompt": "Sửa lỗi TypeScript trong tệp đang mở",
  "context": "export const total = items.reduce((a, b) => a + b);",
  "history": [{ "role": "user", "content": "Chào" }],
  "images": ["https://example.com/screenshot.png"],
  "stream": true,
  "maxTokens": 16384,
  "temperature": 1,
  "topP": 0.95,
  "enableThinking": true
}
```

| Trường           | Mặc định          | Ghi chú                                                                                |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `stream`         | `true`            | `false` trả JSON một lần.                                                              |
| `maxTokens`      | `16384`           | 1–32768.                                                                               |
| `temperature`    | `1`               | 0–2.                                                                                   |
| `topP`           | `0.95`            | 0–1.                                                                                   |
| `seed`           | `42`              | Số nguyên không âm.                                                                    |
| `enableThinking` | `true`            | Gửi `chat_template_kwargs.enable_thinking`.                                            |
| `images`         | —                 | Tối đa 4 ảnh, `https://` hoặc `data:image/...`.                                        |
| `tools`          | —                 | Tối đa 32 function tool; `toolChoice` là `auto`, `none`, `required` hoặc một function. |
| `model`          | `CODING_PI_MODEL` | Cho phép chọn model khác trên cùng khoá.                                               |

### Stream (mặc định)

`Content-Type: text/event-stream`.

```
event: ready
data: {"model":"nvidia/nemotron-3.5-super-vl-120b-a12b"}

event: reasoning
data: {"text":"Người dùng muốn sửa lỗi…"}

event: content
data: {"text":"Trong tệp "}

event: tool_call
data: {"id":"call_1","index":0,"function":{"name":"readFile","arguments":"{\"path\":\"src/a.ts\"}"}}

event: done
data: {"provider":"nvidia","content":"…","reasoning":"…","toolCalls":[],"finishReason":"stop","usage":{"total_tokens":123},"model":"…"}
```

Lỗi xảy ra sau khi HTTP 200 đã gửi thì đi qua `event: error`:

```
event: error
data: {"error":"NVIDIA API đang giới hạn tần suất. Thử lại sau ít phút."}
```

`reasoning_content` được phát riêng để UI có thể hiển thị phần suy nghĩ mà
không trộn vào câu trả lời.

### Không stream

```bash
curl -X POST http://localhost:4028/api/coding-pi/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=…; csrf_token=…" \
  -H "x-csrf-token: …" \
  -d '{"prompt":"Giải thích đoạn code này","stream":false}'
```

```json
{
  "provider": "nvidia",
  "content": "…",
  "reasoning": "…",
  "toolCalls": [],
  "finishReason": "stop",
  "usage": { "total_tokens": 123 },
  "model": "nvidia/nemotron-3.5-super-vl-120b-a12b"
}
```

## Mã lỗi

| Mã    | Nguyên nhân                                                   |
| ----- | ------------------------------------------------------------- |
| `400` | Body/prompt không hợp lệ, tham số ngoài biên, tool sai shape. |
| `401` | Chưa đăng nhập (proxy hoặc route).                            |
| `403` | Không phải admin hoặc thiếu quyền `system:config` / CSRF sai. |
| `429` | NVIDIA giới hạn tần suất.                                     |
| `499` | Client đã huỷ yêu cầu (đóng tab, ngắt kết nối).              |
| `502` | NVIDIA từ chối khoá, không tìm thấy model, hoặc lỗi upstream. |
| `503` | Chưa cấu hình `NVIDIA_API_KEY`.                               |
| `504` | NVIDIA không phản hồi trong `CODING_PI_TIMEOUT_MS`.           |

Mỗi mã lỗi do `provider.ts` quyết định và được `service.ts` nâng thành
`CodingPiUpstreamError` (mang `status`), nên route chỉ cần đổi thành JSON.

## Gọi từ code

```ts
import { streamCodingPi } from "@/features/coding-pi";

await streamCodingPi(
  { prompt: "Tối ưu hàm này", context: source },
  {
    onReasoning: (text) => appendReasoning(text),
    onContent: (text) => appendAnswer(text),
    onToolCall: (call) => runTool(call),
  },
);
```

`askCodingPi()` là bản không stream; `getCodingPiStatus()` đọc `GET` ở trên.
Cả ba dùng `credentials: 'include'` và CSRF token như phần còn lại của app.

Tên event (`ready`, `reasoning`, `content`, `tool_call`, `done`, `error`) nằm
trong `CODING_PI_EVENTS` ở `src/lib/coding-pi/stream.ts` — server và client
dùng chung một hằng số, nên đổi tên event chỉ phải sửa một chỗ.
