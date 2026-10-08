/**
 * Bộ định tuyến model cho Claude chat.
 *
 * Mục tiêu: câu dễ → model rẻ/nhanh, câu khó hoặc đoạn code khó →
 * tự động leo lên model mạnh hơn. Khi model chính lỗi tải (429/5xx/
 * overloaded) thì tự rớt xuống tier thấp hơn thay vì trả 500 cho UI.
 *
 * Pure functions để test được mà không cần gọi Anthropic API.
 */

export type ModelTier = 'fast' | 'balanced' | 'strong';

export interface DifficultyInput {
  prompt: string;
  context?: string;
  historyCount?: number;
}

export interface DifficultyResult {
  score: number;
  reasons: string[];
}

export interface ModelRoute extends DifficultyResult {
  model: string;
  tier: ModelTier;
}

export interface ModelTiers {
  fast: string;
  balanced: string;
  strong: string;
}

const LEGACY_DEFAULT = 'claude-3-5-sonnet-latest';

export function getConfiguredTiers(env: NodeJS.ProcessEnv = process.env): ModelTiers {
  const balanced = env.ANTHROPIC_MODEL_BALANCED || env.ANTHROPIC_MODEL || LEGACY_DEFAULT;
  return {
    fast: env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5',
    balanced,
    // Model mạnh nhất cho câu khó / code khó. Đổi qua env khi Anthropic
    // phát hành thế hệ mới mà không cần sửa code.
    strong: env.ANTHROPIC_MODEL_STRONG || 'claude-opus-4-5',
  };
}

const HARD_KEYWORDS = [
  'refactor',
  'tái cấu trúc',
  'tái cấu trúc',
  'kiến trúc',
  'architecture',
  'concurrency',
  'đồng thời',
  'song song',
  'deadlock',
  'race condition',
  'memory leak',
  'rò rỉ bộ nhớ',
  'bảo mật',
  'security',
  'vulnerability',
  'lỗ hổng',
  'sql injection',
  'xss',
  'transaction',
  'tối ưu hiệu năng',
  'performance',
  'thuật toán',
  'algorithm',
  'migrate',
  'di trú',
  'phức tạp',
  'regex',
  'phân tích sâu',
  'thiết kế lại',
];

const ERROR_SIGNALS = [
  'traceback',
  'stack trace',
  'stacktrace',
  'typeerror',
  'nullpointer',
  'segfault',
  'outofmemory',
  'heap overflow',
  'deadlock detected',
  'econnreset',
];

const REASONING_SIGNALS = [
  'tại sao',
  'giải thích',
  'phân tích',
  'so sánh',
  'đánh giá',
  'why',
  'compare',
];

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return count;
    count += 1;
    from = idx + needle.length;
  }
}

export function scoreDifficulty(input: DifficultyInput): DifficultyResult {
  const prompt = input.prompt || '';
  const context = input.context || '';
  const historyCount = input.historyCount || 0;
  const combined = `${prompt}\n${context}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  // Độ dài prompt: câu hỏi dài thường mang nhiều ràng buộc hơn.
  if (prompt.length > 6000) add(35, 'prompt rất dài (>6000 ký tự)');
  else if (prompt.length > 2000) add(20, 'prompt dài (>2000 ký tự)');
  else if (prompt.length > 800) add(8, 'prompt trung bình (>800 ký tự)');

  // Độ dài file đính kèm: file lớn = nhiều ngữ cảnh phải suy luận.
  if (context.length > 60000) add(35, 'file đính kèm rất lớn (>60k ký tự)');
  else if (context.length > 20000) add(20, 'file đính kèm lớn (>20k ký tự)');
  else if (context.length > 6000) add(8, 'file đính kèm trung bình (>6k ký tự)');

  // Lịch sử dài: hội thoại nhiều vòng thường là vấn đề chưa giải xong.
  if (historyCount >= 14) add(10, 'hội thoại dài (>=14 lượt)');
  else if (historyCount >= 8) add(6, 'hội thoại nhiều vòng (>=8 lượt)');

  // Khối code: càng nhiều fence càng giống debug/refactor nhiều file.
  const fences = countOccurrences(combined, '```');
  if (fences >= 8) add(25, 'nhiều khối code (>=4 cặp fence)');
  else if (fences >= 4) add(15, 'có nhiều khối code (>=2 cặp fence)');
  else if (fences >= 2) add(8, 'có khối code');

  // Stack trace / lỗi runtime: khó hơn câu hỏi lý thuyết.
  const errorHits = ERROR_SIGNALS.filter((s) => combined.includes(s));
  if (errorHits.length > 0) {
    add(Math.min(15 + (errorHits.length - 1) * 5, 25), `có tín hiệu lỗi runtime (${errorHits[0]})`);
  }

  // Từ khóa bài toán khó.
  const hardHits = HARD_KEYWORDS.filter((s) => combined.includes(s));
  if (hardHits.length > 0) {
    add(Math.min(hardHits.length * 10, 30), `từ khóa khó: ${hardHits.slice(0, 3).join(', ')}`);
  }

  // Câu hỏi suy luận sâu.
  const reasoningHits = REASONING_SIGNALS.filter((s) => combined.includes(s));
  if (reasoningHits.length >= 2) add(8, 'câu hỏi suy luận sâu');

  // Nhiều file gộp trong một context.
  const fileMarkers = countOccurrences(combined, '<file>') + countOccurrences(combined, '--- file');
  if (fileMarkers >= 2 || countOccurrences(prompt, 'file ') >= 3) {
    add(8, 'đề cập nhiều file');
  }

  return { score: Math.min(score, 100), reasons };
}

export const STRONG_THRESHOLD = 60;
export const BALANCED_THRESHOLD = 30;

export function tierForScore(score: number): ModelTier {
  if (score >= STRONG_THRESHOLD) return 'strong';
  if (score >= BALANCED_THRESHOLD) return 'balanced';
  return 'fast';
}

/**
 * Chọn model chính cho một request. `manualModel` (client gửi lên khi user
 * tự chọn model) luôn thắng auto-switch để không gây bất ngờ.
 */
export function selectModelForChat(
  input: DifficultyInput,
  tiers: ModelTiers,
  manualModel?: string
): ModelRoute {
  if (manualModel && manualModel.trim()) {
    return { model: manualModel.trim(), tier: 'balanced', score: 0, reasons: ['user chọn tay'] };
  }
  const difficulty = scoreDifficulty(input);
  const tier = tierForScore(difficulty.score);
  return { ...difficulty, tier, model: tiers[tier] };
}

/**
 * Thứ tự thử khi model chính lỗi. Tier mạnh thử trước rồi rớt dần,
 * tier rẻ thử trước rồi mới leo lên để tránh kẹt ở model lỗi.
 */
export function getFallbackChain(primary: ModelTier, tiers: ModelTiers): string[] {
  if (primary === 'strong') return [tiers.strong, tiers.balanced, tiers.fast];
  if (primary === 'balanced') return [tiers.balanced, tiers.fast, tiers.strong];
  return [tiers.fast, tiers.balanced, tiers.strong];
}

/** Lỗi nào thì đáng thử model khác thay vì trả lỗi ngay cho UI. */
export function isRetryableUpstream(status: number, bodyText: string): boolean {
  if (status === 429 || status === 502 || status === 503 || status === 529) return true;
  const lowered = (bodyText || '').toLowerCase();
  return (
    lowered.includes('overloaded') ||
    lowered.includes('rate limit') ||
    lowered.includes('try again')
  );
}
