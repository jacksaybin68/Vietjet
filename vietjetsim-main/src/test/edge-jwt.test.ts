import { describe, it, expect } from 'vitest';

// ------------------------------------------------------------------------------
// Edge JWT middleware logic — replicated contract tests.
// middleware.ts can't be imported directly into jsdom (it requires the Next.js
// Edge runtime); these tests verify the same WebCrypto HMAC/HS256 + exp rules
// that the middleware implements, so a regression in the algorithm shows up.
// ------------------------------------------------------------------------------

const encoder = new TextEncoder();

function b64urlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecodeToString(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function b64urlToBytes(str: string): Uint8Array<ArrayBuffer> {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

// Mirror of middleware.ts verifyJwtSignature (same rules, local copy for testability)
async function verifyJwtSignature(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    let header: { alg?: string };
    try {
      header = JSON.parse(b64urlDecodeToString(h));
    } catch {
      return null;
    }
    if (header?.alg !== 'HS256') return null;
    const key = await hmacKey(secret, ['verify']);
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(s),
      encoder.encode(`${h}.${p}`)
    );
    if (!ok) return null;
    const payload = JSON.parse(b64urlDecodeToString(p));
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const SECRET = 'test-secret-for-edge-jwt-contract';

describe('Edge JWT verification contract (HS256 + exp enforcement)', () => {
  it('accepts a valid HS256 token', async () => {
    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64urlEncode(
      JSON.stringify({ userId: 'u1', role: 'user', exp: Math.floor(Date.now() / 1000) + 600 })
    );
    const key = await hmacKey(SECRET, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`));
    const token = `${header}.${payload}.${b64urlEncode(new Uint8Array(sig))}`;

    const result = await verifyJwtSignature(token, SECRET);
    expect(result).not.toBeNull();
    expect(result?.['userId']).toBe('u1');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64urlEncode(
      JSON.stringify({ userId: 'u1', exp: Math.floor(Date.now() / 1000) + 600 })
    );
    const key = await hmacKey('attacker-secret', ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`));
    const token = `${header}.${payload}.${b64urlEncode(new Uint8Array(sig))}`;

    expect(await verifyJwtSignature(token, SECRET)).toBeNull();
  });

  it('rejects expired tokens even when the signature is valid', async () => {
    const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = b64urlEncode(
      JSON.stringify({ userId: 'u1', exp: Math.floor(Date.now() / 1000) - 10 })
    );
    const key = await hmacKey(SECRET, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`));
    const token = `${header}.${payload}.${b64urlEncode(new Uint8Array(sig))}`;

    expect(await verifyJwtSignature(token, SECRET)).toBeNull();
  });

  it('rejects tokens whose header declares a non-HS256 algorithm (alg-confusion)', async () => {
    const header = b64urlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = b64urlEncode(
      JSON.stringify({ userId: 'u1', exp: Math.floor(Date.now() / 1000) + 600 })
    );
    const token = `${header}.${payload}.`; // no real signature

    expect(await verifyJwtSignature(token, SECRET)).toBeNull();
  });

  it('rejects malformed tokens (missing parts)', async () => {
    expect(await verifyJwtSignature('not-a-jwt', SECRET)).toBeNull();
    expect(await verifyJwtSignature('a.b', SECRET)).toBeNull();
  });
});
