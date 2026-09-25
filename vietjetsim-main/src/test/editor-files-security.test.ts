import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { GET as listEditorFiles, POST as saveEditorFile } from '@/app/api/editor/files/route';

vi.mock('@/lib/neon', async () => {
  const { SYSTEM_ROLES } = await import('@/lib/rbac');
  const queryMock = vi.fn().mockResolvedValue([{ total: '0' }]);
  // `verifyAdminRequest` is fail-closed, so the permission lookup has to answer
  // with real grants. Without this branch every admin route 403s and the test
  // would be asserting against a database no deployment has.
  const tagged = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    if (/from\s+role_permissions/i.test(text)) {
      const role = String(values[0]);
      return Promise.resolve(
        Array.from(SYSTEM_ROLES[role]?.permissions ?? []).map((permission) => ({ permission }))
      );
    }
    return Promise.resolve([]);
  });
  const sqlMock = Object.assign(tagged, {
    query: queryMock,
    begin: vi.fn(),
    transaction: vi.fn().mockResolvedValue([[]]),
  });
  return { sql: sqlMock };
});

const adminToken = signAccessToken({
  userId: 'test-admin-id',
  email: 'admin@vietjetsim.vn',
  role: 'admin',
  fullName: 'Test Admin',
});

const userToken = signAccessToken({
  userId: 'test-user-id',
  email: 'user@vietjetsim.vn',
  role: 'user',
  fullName: 'Test User',
});

function getRequest(query: string, token?: string) {
  return new NextRequest(`http://localhost:4028/api/editor/files?${query}`, {
    headers: token ? { cookie: `access_token=${token}` } : {},
  });
}

describe('Editor files API authorization', () => {
  it('rejects anonymous requests with 401', async () => {
    const res = await listEditorFiles(getRequest('action=tree'));

    expect(res.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const res = await listEditorFiles(getRequest('action=tree', userToken));

    expect(res.status).toBe(403);
  });

  it('rejects anonymous writes with 401', async () => {
    const req = new NextRequest('http://localhost:4028/api/editor/files', {
      method: 'POST',
      body: JSON.stringify({ path: 'package.json', content: '{}' }),
    });

    const res = await saveEditorFile(req);

    expect(res.status).toBe(401);
  });

  it('blocks path traversal for admins', async () => {
    const res = await listEditorFiles(
      getRequest(`path=${encodeURIComponent('../../etc/passwd')}`, adminToken)
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('blocks reads of secret-bearing files for admins', async () => {
    for (const secretPath of ['.env.local', '.env', 'config/server.key', 'certs/app.pem']) {
      const res = await listEditorFiles(
        getRequest(`path=${encodeURIComponent(secretPath)}`, adminToken)
      );

      expect(res.status, secretPath).toBe(404);
      expect((await res.json()).ok, secretPath).toBe(false);
    }
  });

  it('blocks writes to secret-bearing files for admins', async () => {
    const req = new NextRequest('http://localhost:4028/api/editor/files', {
      method: 'POST',
      headers: { cookie: `access_token=${adminToken}` },
      body: JSON.stringify({ path: '.env.local', content: 'DATABASE_URL=leak' }),
    });

    const res = await saveEditorFile(req);

    expect(res.status).toBe(403);
  });

  it('does not leak env files in the directory tree', async () => {
    const res = await listEditorFiles(getRequest('action=tree', adminToken));

    expect(res.status).toBe(200);
    const { tree } = await res.json();

    const names = JSON.stringify(tree);
    expect(names).not.toContain('node_modules');
    expect(names).not.toContain('.env');
  });
});
