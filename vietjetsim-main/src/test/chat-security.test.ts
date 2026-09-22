/**
 * Security tests for the chat API (`/api/tro-chuyen/*`).
 *
 * Covers CSRF enforcement on mutations and conversation ownership (IDOR)
 * checks for regular users, plus the mark-read flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/lib/auth';
import { GET as getMessages, POST as postMessage } from '@/app/api/tro-chuyen/route';
import { GET as getConversations } from '@/app/api/tro-chuyen/cuoc-hoi-thoai/route';
import { POST as markRead } from '@/app/api/tro-chuyen/danh-dau-da-doc/route';
import { GET as getPresence, POST as postPresence } from '@/app/api/tro-chuyen/truc-tuyen/route';
import { POST as postAi } from '@/app/api/tro-ly-ai/tro-chuyen/route';
import * as db from '@/lib/db';

vi.mock('@/lib/neon', () => {
  const sqlMock = Object.assign(vi.fn().mockResolvedValue([]), {
    query: vi.fn().mockResolvedValue([]),
  });
  return { sql: sqlMock };
});

const CSRF_TOKEN = 'test-csrf-token';

const withCsrf = (token: string) => ({
  cookie: `access_token=${token}; csrf_token=${CSRF_TOKEN}`,
  'x-csrf-token': CSRF_TOKEN,
});

const userToken = () =>
  signAccessToken({
    userId: 'user-1',
    email: 'user@vietjetsim.vn',
    role: 'user',
    fullName: 'Test User',
  });

const adminToken = () =>
  signAccessToken({
    userId: 'admin-1',
    email: 'admin@vietjetsim.vn',
    role: 'admin',
    fullName: 'Test Admin',
  });

describe('Chat API security', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/tro-chuyen (messages)', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen?conversationId=c1');
      const res = await getMessages(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 when conversationId is missing', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        headers: { cookie: `access_token=${userToken()}` },
      });
      const res = await getMessages(req);
      expect(res.status).toBe(400);
    });

    it('denies a user reading a conversation they do not own (403)', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(false);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen?conversationId=c1', {
        headers: { cookie: `access_token=${userToken()}` },
      });
      const res = await getMessages(req);
      expect(res.status).toBe(403);
    });

    it('allows the owner to read their conversation', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(true);
      vi.spyOn(db, 'getConversationMessages').mockResolvedValue([]);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen?conversationId=c1', {
        headers: { cookie: `access_token=${userToken()}` },
      });
      const res = await getMessages(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ conversationId: 'c1', messages: [] });
    });

    it('lets an admin read any conversation without an ownership lookup', async () => {
      const ownsSpy = vi.spyOn(db, 'userOwnsConversation');
      vi.spyOn(db, 'getConversationMessages').mockResolvedValue([]);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen?conversationId=c1', {
        headers: { cookie: `access_token=${adminToken()}` },
      });
      const res = await getMessages(req);
      expect(res.status).toBe(200);
      expect(ownsSpy).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/tro-chuyen (send message)', () => {
    it('rejects a missing CSRF token with 403 before any DB work', async () => {
      const sendSpy = vi.spyOn(db, 'sendChatMessage');
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        method: 'POST',
        headers: { cookie: `access_token=${userToken()}` },
        body: JSON.stringify({ conversation_id: 'c1', content: 'hi' }),
      });
      const res = await postMessage(req);
      expect(res.status).toBe(403);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('denies sending into a conversation the user does not own (403)', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(false);
      const sendSpy = vi.spyOn(db, 'sendChatMessage');
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversation_id: 'c1', content: 'hi' }),
      });
      const res = await postMessage(req);
      expect(res.status).toBe(403);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('rejects empty content with 400', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(true);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversation_id: 'c1', content: '   ' }),
      });
      const res = await postMessage(req);
      expect(res.status).toBe(400);
    });

    it('sends the message for an owned conversation', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(true);
      vi.spyOn(db, 'sendChatMessage').mockResolvedValue({
        id: 'm1',
        conversation_id: 'c1',
        sender_id: 'user-1',
        sender_role: 'user',
        content: 'hi',
        read_at: null,
        created_at: '2026-01-01T00:00:00Z',
      });
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversation_id: 'c1', content: 'hi' }),
      });
      const res = await postMessage(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toMatchObject({ id: 'm1', sender_role: 'user' });
    });
  });

  describe('POST /api/tro-chuyen/danh-dau-da-doc', () => {
    it('requires CSRF', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/danh-dau-da-doc', {
        method: 'POST',
        headers: { cookie: `access_token=${userToken()}` },
        body: JSON.stringify({ conversation_id: 'c1' }),
      });
      const res = await markRead(req);
      expect(res.status).toBe(403);
    });

    it('rejects a non-owner with 403', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(false);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/danh-dau-da-doc', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversation_id: 'c1' }),
      });
      const res = await markRead(req);
      expect(res.status).toBe(403);
    });

    it('marks messages read for the owner', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(true);
      vi.spyOn(db, 'markConversationRead').mockResolvedValue(3);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/danh-dau-da-doc', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversation_id: 'c1' }),
      });
      const res = await markRead(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ success: true, marked: 3 });
    });
  });

  describe('GET /api/tro-chuyen/cuoc-hoi-thoai', () => {
    it('returns only the caller conversation for a regular user', async () => {
      vi.spyOn(db, 'getOrCreateConversation').mockResolvedValue({
        id: 'c1',
        user_id: 'user-1',
      } as never);
      const allSpy = vi.spyOn(db, 'getAllConversations');
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-hoi-thoai', {
        headers: { cookie: `access_token=${userToken()}` },
      });
      const res = await getConversations(req);
      expect(res.status).toBe(200);
      expect(allSpy).not.toHaveBeenCalled();
      const data = await res.json();
      expect(data.conversations).toHaveLength(1);
    });

    it('returns all conversations for an admin', async () => {
      vi.spyOn(db, 'getAllConversations').mockResolvedValue({
        conversations: [{ id: 'c1' }, { id: 'c2' }] as never,
        total: 2,
      });
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-hoi-thoai', {
        headers: { cookie: `access_token=${adminToken()}` },
      });
      const res = await getConversations(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.conversations).toHaveLength(2);
    });
  });

  describe('GET /api/tro-chuyen/truc-tuyen (presence)', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const req = new NextRequest(
        'http://localhost:4028/api/tro-chuyen/truc-tuyen?conversationId=c1'
      );
      const res = await getPresence(req);
      expect(res.status).toBe(401);
    });

    it('denies reading presence for a conversation the user does not own (403)', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(false);
      const req = new NextRequest(
        'http://localhost:4028/api/tro-chuyen/truc-tuyen?conversationId=c1',
        { headers: { cookie: `access_token=${userToken()}` } }
      );
      const res = await getPresence(req);
      expect(res.status).toBe(403);
    });

    it("ignores a client-supplied role and reads the caller's own row", async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(true);
      const presenceSpy = vi.spyOn(db, 'getChatPresence').mockResolvedValue(null);
      const req = new NextRequest(
        'http://localhost:4028/api/tro-chuyen/truc-tuyen?conversationId=c1&role=admin',
        { headers: { cookie: `access_token=${userToken()}` } }
      );
      const res = await getPresence(req);
      expect(res.status).toBe(200);
      expect(presenceSpy).toHaveBeenCalledWith('c1', 'user');
    });

    it('lets an admin read presence without an ownership lookup', async () => {
      const ownsSpy = vi.spyOn(db, 'userOwnsConversation');
      vi.spyOn(db, 'getChatPresence').mockResolvedValue(null);
      const req = new NextRequest(
        'http://localhost:4028/api/tro-chuyen/truc-tuyen?conversationId=c1',
        { headers: { cookie: `access_token=${adminToken()}` } }
      );
      const res = await getPresence(req);
      expect(res.status).toBe(200);
      expect(ownsSpy).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/tro-chuyen/truc-tuyen (presence)', () => {
    it('requires a CSRF token', async () => {
      const updateSpy = vi.spyOn(db, 'updateChatPresence');
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/truc-tuyen', {
        method: 'POST',
        headers: { cookie: `access_token=${userToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'c1', is_online: true }),
      });
      const res = await postPresence(req);
      expect(res.status).toBe(403);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('denies updating presence for a conversation the user does not own (403)', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(false);
      const updateSpy = vi.spyOn(db, 'updateChatPresence');
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/truc-tuyen', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversationId: 'c1', is_online: true }),
      });
      const res = await postPresence(req);
      expect(res.status).toBe(403);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('updates presence for the owner under their real role', async () => {
      vi.spyOn(db, 'userOwnsConversation').mockResolvedValue(true);
      const updateSpy = vi.spyOn(db, 'updateChatPresence').mockResolvedValue({} as never);
      const req = new NextRequest('http://localhost:4028/api/tro-chuyen/truc-tuyen', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ conversationId: 'c1', is_online: true }),
      });
      const res = await postPresence(req);
      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith('user-1', 'c1', 'user', {
        is_online: true,
      });
    });
  });

  describe('POST /api/tro-ly-ai/tro-chuyen (AI assistant)', () => {
    it('rejects an unauthenticated request with 401', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'hi' }),
      });
      const res = await postAi(req);
      expect(res.status).toBe(401);
    });

    it('rejects a non-admin user with 403', async () => {
      const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
        method: 'POST',
        headers: withCsrf(userToken()),
        body: JSON.stringify({ message: 'hi' }),
      });
      const res = await postAi(req);
      expect(res.status).toBe(403);
    });

    it('allows an admin through to the assistant', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ reply: 'Xin chào' }),
        })
      );
      const req = new NextRequest('http://localhost:4028/api/tro-ly-ai/tro-chuyen', {
        method: 'POST',
        headers: withCsrf(adminToken()),
        body: JSON.stringify({ message: 'hi' }),
      });
      const res = await postAi(req);
      expect(res.status).toBe(200);
      expect((await res.json()).content).toBe('Xin chào');
    });
  });
});
