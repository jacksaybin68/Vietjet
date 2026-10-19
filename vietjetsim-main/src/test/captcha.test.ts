import { describe, it, expect, vi, afterEach } from 'vitest';
import { CAPTCHA_TTL_SECONDS, createCaptchaChallenge, verifyCaptcha } from '@/lib/captcha';

/**
 * The simulated CAPTCHA signs its operands with HMAC-SHA256 and never ships the
 * answer to the client. These tests pin the properties a bot would need to break:
 * the answer must be recoverable only by the holder of the key, and a token must
 * not outlive its TTL.
 */

/** The question is "a + b = ?" or "a − b = ?"; the answer is what we computed. */
function answerOf(question: string): number {
  const [a, op, b] = question.split(' ');
  return op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
}

describe('CAPTCHA challenge', () => {
  it('verifies the correct answer to the challenge it issued', () => {
    const challenge = createCaptchaChallenge();
    expect(verifyCaptcha(challenge.token, answerOf(challenge.question))).toBe(true);
    // The answer must accept the numeric string the form sends back.
    expect(verifyCaptcha(challenge.token, String(answerOf(challenge.question)))).toBe(true);
  });

  it('rejects a wrong answer', () => {
    const challenge = createCaptchaChallenge();
    const wrong = answerOf(challenge.question) + 1;
    expect(verifyCaptcha(challenge.token, wrong)).toBe(false);
  });

  it('rejects a tampered token', () => {
    const challenge = createCaptchaChallenge();
    const [payload, signature] = challenge.token.split('.');
    expect(
      verifyCaptcha(`${payload}.${signature.slice(0, -1)}x`, answerOf(challenge.question))
    ).toBe(false);
    // A payload whose operands were edited but whose signature was reused.
    const forged = Buffer.from(
      JSON.stringify({ a: 1, b: 1, op: 'add', n: 'x', iat: Date.now() })
    ).toString('base64url');
    expect(verifyCaptcha(`${forged}.${signature}`, 2)).toBe(false);
    expect(verifyCaptcha('not-a-token', 1)).toBe(false);
    expect(verifyCaptcha(undefined, 1)).toBe(false);
    expect(verifyCaptcha(challenge.token, '')).toBe(false);
  });

  it('never returns the answer in the challenge payload', () => {
    const challenge = createCaptchaChallenge();
    const decoded = JSON.parse(Buffer.from(challenge.token.split('.')[0], 'base64url').toString());
    expect(decoded).not.toHaveProperty('answer');
    expect(decoded).toMatchObject({
      a: expect.any(Number),
      b: expect.any(Number),
      op: expect.any(String),
    });
    expect(challenge.expiresIn).toBe(CAPTCHA_TTL_SECONDS);
  });

  it('rejects an expired challenge', () => {
    vi.useFakeTimers();
    try {
      const challenge = createCaptchaChallenge();
      const answer = answerOf(challenge.question);
      vi.advanceTimersByTime((CAPTCHA_TTL_SECONDS + 1) * 1000);
      expect(verifyCaptcha(challenge.token, answer)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
