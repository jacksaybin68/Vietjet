import { describe, it, expect } from 'vitest';
import {
  getFallbackChain,
  isRetryableUpstream,
  scoreDifficulty,
  selectModelForChat,
  tierForScore,
} from '@/lib/claude-model-router';

const TIERS = { fast: 'haiku', balanced: 'sonnet', strong: 'opus' };

describe('auto-switch model theo độ khó', () => {
  it('câu chào ngắn đi model rẻ', () => {
    const route = selectModelForChat({ prompt: 'xin chào' }, TIERS);
    expect(route.tier).toBe('fast');
    expect(route.model).toBe('haiku');
  });

  it('đoạn code khó + stack trace leo lên model mạnh', () => {
    const prompt = [
      'Hãy refactor kiến trúc này, đang bị deadlock và race condition,',
      'có memory leak và lỗ hổng bảo mật SQL injection.',
      '```ts',
      'stack trace: TypeError: Cannot read properties of undefined',
      '```',
      '```ts',
      'code thứ hai cần tối ưu hiệu năng thuật toán',
      '```',
    ].join('\n');
    const context = 'x'.repeat(25_000);
    const route = selectModelForChat({ prompt, context, historyCount: 12 }, TIERS);
    expect(route.score).toBeGreaterThanOrEqual(60);
    expect(route.tier).toBe('strong');
    expect(route.model).toBe('opus');
    expect(route.reasons.length).toBeGreaterThan(0);
  });

  it('câu trung bình dừng ở balanced', () => {
    const { score } = scoreDifficulty({
      prompt: `${'x'.repeat(2500)} refactor \`\`\`code\`\`\``,
    });
    expect(score).toBeGreaterThanOrEqual(30);
    expect(score).toBeLessThan(60);
    expect(tierForScore(score)).toBe('balanced');
  });

  it('user chọn tay luôn thắng auto-switch', () => {
    const route = selectModelForChat({ prompt: 'x'.repeat(50_000) }, TIERS, 'my-model');
    expect(route.model).toBe('my-model');
  });

  it('fallback rớt dần từ mạnh xuống rẻ', () => {
    expect(getFallbackChain('strong', TIERS)).toEqual(['opus', 'sonnet', 'haiku']);
    expect(getFallbackChain('fast', TIERS)).toEqual(['haiku', 'sonnet', 'opus']);
  });

  it('chỉ retry khi lỗi quá tải/quota', () => {
    expect(isRetryableUpstream(429, '')).toBe(true);
    expect(isRetryableUpstream(529, '')).toBe(true);
    expect(isRetryableUpstream(400, 'invalid request')).toBe(false);
    expect(isRetryableUpstream(401, 'auth')).toBe(false);
    expect(isRetryableUpstream(500, 'overloaded')).toBe(true);
  });
});
