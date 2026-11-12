import type {
  CodingPiMessage,
  CodingPiToolCall,
  CodingPiToolChoice,
  CodingPiToolDefinition,
} from '@/lib/coding-pi/protocol';
import type { CodingPiResult } from '@/lib/coding-pi/stream';

export type {
  CodingPiContentPart,
  CodingPiImagePart,
  CodingPiMessage,
  CodingPiRole,
  CodingPiTextPart,
  CodingPiToolCall,
  CodingPiToolChoice,
  CodingPiToolDefinition,
  CodingPiUsage,
} from '@/lib/coding-pi/protocol';

export type { CodingPiResult } from '@/lib/coding-pi/stream';

/** Một lượt chat gửi lên API. */
export interface CodingPiChatInput {
  prompt?: string;
  context?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  messages?: CodingPiMessage[];
  images?: Array<string | { url: string } | { type: 'image_url'; image_url: { url: string } }>;
  tools?: CodingPiToolDefinition[];
  toolChoice?: CodingPiToolChoice;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  enableThinking?: boolean;
  signal?: AbortSignal;
}

/** Callback cho từng event SSE mà API phát ra. */
export interface CodingPiStreamHandlers {
  onReady?: (info: { model: string }) => void;
  onReasoning?: (text: string) => void;
  onContent?: (text: string) => void;
  onToolCall?: (call: CodingPiToolCall) => void;
  onDone?: (result: CodingPiResult) => void;
}

/** Trạng thái backend do `GET /api/coding-pi/chat` trả về. */
export interface CodingPiStatus {
  provider: 'nvidia';
  configured: boolean;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  thinking: boolean;
  timeoutMs: number;
}

/** Event đọc được từ luồng SSE. */
export type CodingPiStreamEvent =
  | { type: 'ready'; model: string }
  | { type: 'reasoning'; text: string }
  | { type: 'content'; text: string }
  | { type: 'tool_call'; call: CodingPiToolCall }
  | { type: 'done'; result: CodingPiResult }
  | { type: 'error'; message: string };
