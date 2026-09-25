/**
 * Neon Serverless PostgreSQL Client
 *
 * This module provides the sql template tag for database queries.
 * In production, uses @neondatabase/serverless with connection pooling.
 * In development/demo mode, uses a mock implementation.
 */

import { neon, neonConfig } from '@neondatabase/serverless';

import { SYSTEM_ROLES } from '@/lib/rbac';

// Check if we have a real database connection
const hasRealDb = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqlFn: any;

if (hasRealDb) {
  // Real Neon connection
  sqlFn = neon(process.env.DATABASE_URL!);
  // Local dev/database-behind-proxy setups (NEON_FETCH_ENDPOINT in .env.local):
  // the driver otherwise derives `https://<host>/sql` from the connection
  // string, which neither resolves nor speaks plain HTTP for local hosts.
  if (process.env.NEON_FETCH_ENDPOINT) {
    neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  }
} else {
  // Mock implementation for development without DB
  console.warn('⚠️  DATABASE_URL not set. Using mock database. Do not use in production.');
  sqlFn = createMockSql();
}

export { sqlFn as sql };

// ─── Mock Implementation ─────────────────────────────────────────────────────

interface MockResult {
  [key: string]: unknown;
}

function createMockSql() {
  const mockData: Record<string, MockResult[]> = {
    'SELECT * FROM airports ORDER BY city': [
      {
        id: '1',
        code: 'SGN',
        name: 'Tân Sơn Nhất',
        city: 'TP Hồ Chí Minh',
        country: 'Vietnam',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        code: 'HAN',
        name: 'Nội Bài',
        city: 'Hà Nội',
        country: 'Vietnam',
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        code: 'DAD',
        name: 'Đà Nẵng',
        city: 'Đà Nẵng',
        country: 'Vietnam',
        created_at: new Date().toISOString(),
      },
    ],
  };

  // ─── role_permissions ──────────────────────────────────────────────────────
  // `verifyAdminRequest` is fail-closed, so a role with no rows can call no
  // guarded route. Without this handler every admin-route test would 403 purely
  // because the in-memory database had no grants — the mock has to mirror the
  // seed in migrations/019_role_permissions.sql, or tests would assert against
  // a database no real deployment ever has.
  const runRolePermissionQuery = (query: string, values: unknown[]): MockResult[] | null => {
    if (!/from\s+role_permissions/i.test(query)) return null;
    const role = values[0];
    const grants = Array.from(SYSTEM_ROLES[String(role)]?.permissions ?? []);
    return grants.map((permission) => ({ permission }));
  };

  // ─── In-memory chat store ────────────────────────────────────────────────────
  // Chat is entirely query-driven, so without a real database every read would
  // return `[]` (and `getAllConversations` would crash on `countResult[0]`),
  // leaving the UI looking broken. Keep a minimal in-memory store so chat is
  // exercisable in dev/CI, seeded with one thread so the admin console is not
  // empty on a fresh start.
  const chatConversations: MockResult[] = [];
  const chatMessages: MockResult[] = [];
  const chatPresence: MockResult[] = [];

  const nowIso = () => new Date().toISOString();
  let chatSeq = 0;
  const nextChatId = (prefix: string) => `${prefix}-mock-${++chatSeq}`;

  const seedConversationId = 'conv-mock-demo';
  chatConversations.push({
    id: seedConversationId,
    user_id: 'mock-user-demo',
    user_email: 'user@vietjetsim.vn',
    user_name: 'Người dùng Demo',
    status: 'active',
    last_message: 'Tôi cần hỗ trợ đổi ngày bay',
    unread_by_user: 0,
    unread_by_admin: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  chatMessages.push(
    {
      id: nextChatId('msg'),
      conversation_id: seedConversationId,
      sender_id: 'mock-user-demo',
      sender_role: 'user',
      content: 'Xin chào, tôi cần hỗ trợ.',
      read_at: null,
      created_at: nowIso(),
    },
    {
      id: nextChatId('msg'),
      conversation_id: seedConversationId,
      sender_id: 'mock-user-demo',
      sender_role: 'user',
      content: 'Tôi cần hỗ trợ đổi ngày bay',
      read_at: null,
      created_at: nowIso(),
    }
  );

  const normalizeSql = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

  /** Handles a chat query, or returns null when the text is not chat-related. */
  function runChatQuery(text: string, values: unknown[]): MockResult[] | null {
    const q = normalizeSql(text);

    if (q.includes('insert into chat_conversations')) {
      const [userId, userEmail, userName] = values as [string, string, string];
      const row: MockResult = {
        id: nextChatId('conv'),
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        status: 'active',
        last_message: null,
        unread_by_user: 0,
        unread_by_admin: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      chatConversations.push(row);
      return [row];
    }

    if (q.includes('count(*) as total from chat_conversations')) {
      return [{ total: chatConversations.length }];
    }

    if (q.includes("from chat_conversations where user_id = ? and status = 'active'")) {
      return chatConversations.filter((c) => c.user_id === values[0] && c.status === 'active');
    }

    if (q.includes('from chat_conversations where id = ? and user_id = ?')) {
      const owned = chatConversations.some((c) => c.id === values[0] && c.user_id === values[1]);
      return owned ? [{ owned: 1 }] : [];
    }

    if (q.includes('from chat_conversations')) {
      const limit = typeof values[0] === 'number' ? values[0] : chatConversations.length;
      const offset = typeof values[1] === 'number' ? values[1] : 0;
      const sorted = [...chatConversations].sort(
        (a, b) =>
          new Date(b.updated_at as string).getTime() - new Date(a.updated_at as string).getTime()
      );
      return sorted.slice(offset, offset + limit);
    }

    if (q.includes('insert into chat_messages')) {
      const [conversationId, senderId, senderRole, content] = values as [
        string,
        string,
        'user' | 'admin',
        string,
      ];
      const row: MockResult = {
        id: nextChatId('msg'),
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        read_at: null,
        created_at: nowIso(),
      };
      chatMessages.push(row);
      return [row];
    }

    if (q.includes('update chat_messages set read_at = now()')) {
      const [conversationId, senderRole] = values as [string, string];
      const flipped = chatMessages.filter(
        (m) => m.conversation_id === conversationId && m.sender_role === senderRole && !m.read_at
      );
      for (const m of flipped) m.read_at = nowIso();
      return flipped.map((m) => ({ id: m.id }));
    }

    if (q.includes('from chat_messages where conversation_id = ?')) {
      const [conversationId, limit, offset] = values as [
        string,
        number | undefined,
        number | undefined,
      ];
      const rows = chatMessages
        .filter((m) => m.conversation_id === conversationId)
        .sort(
          (a, b) =>
            new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()
        );
      const start = typeof offset === 'number' ? offset : 0;
      return rows.slice(start, typeof limit === 'number' ? start + limit : undefined);
    }

    if (q.includes('insert into chat_presence')) {
      const [userId, conversationId, role, isOnline, isTyping] = values as [
        string,
        string,
        'user' | 'admin',
        boolean,
        boolean,
      ];
      const row: MockResult = {
        id: nextChatId('presence'),
        user_id: userId,
        conversation_id: conversationId,
        role,
        is_online: isOnline,
        is_typing: isTyping,
        last_seen: nowIso(),
        updated_at: nowIso(),
      };
      chatPresence.push(row);
      return [row];
    }

    if (q.includes('update chat_presence set')) {
      const [isOnline, isTyping, conversationId, role] = values as [
        boolean | undefined,
        boolean | undefined,
        string,
        string,
      ];
      const row = chatPresence.find((p) => p.conversation_id === conversationId && p.role === role);
      if (!row) return [];
      if (isOnline !== undefined && isOnline !== null) row.is_online = isOnline;
      if (isTyping !== undefined && isTyping !== null) row.is_typing = isTyping;
      row.last_seen = nowIso();
      row.updated_at = nowIso();
      return [row];
    }

    if (q.includes('from chat_presence where conversation_id = ? and role = ?')) {
      return chatPresence.filter((p) => p.conversation_id === values[0] && p.role === values[1]);
    }

    // Conversation counters, issued through `sql.query` by sendChatMessage and
    // markConversationRead. The last bound value is always the conversation id.
    if (q.includes('update chat_conversations set')) {
      const row = chatConversations.find((c) => c.id === values[values.length - 1]);
      if (!row) return [];
      if (q.includes('last_message')) {
        row.last_message = values[0] as string;
        if (q.includes('unread_by_admin = unread_by_admin + 1')) {
          row.unread_by_admin = ((row.unread_by_admin as number) || 0) + 1;
        }
        if (q.includes('unread_by_user = unread_by_user + 1')) {
          row.unread_by_user = ((row.unread_by_user as number) || 0) + 1;
        }
      }
      if (q.includes('unread_by_user = 0')) row.unread_by_user = 0;
      if (q.includes('unread_by_admin = 0')) row.unread_by_admin = 0;
      if (q.includes('set status = ?')) row.status = values[0] as string;
      row.updated_at = nowIso();
      return [row];
    }

    return null;
  }

  return Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      // Mirror the real Neon client, which rejects a non-template invocation:
      // it requires `Array.isArray(strings) && Array.isArray(strings.raw)`.
      // Without this guard a call like `sql(dynamicString, ...values)` silently
      // "worked" in dev/test and then threw a 500 against a real database.
      if (!(Array.isArray(strings) && Array.isArray((strings as TemplateStringsArray).raw))) {
        throw new Error(
          'This function can now be called only as a tagged-template function: ' +
            'sql`SELECT ${value}`, not sql("SELECT $1", [value], options). ' +
            'For a conventional function call with value placeholders ' +
            '($1, $2, etc.), use sql.query("SELECT $1", [value], options).'
        );
      }

      const query = strings.join('?');
      console.info('[MOCK SQL]', query, values);

      const chatResult = runChatQuery(query, values);
      if (chatResult) return chatResult;

      const rolePermissionResult = runRolePermissionQuery(query, values);
      if (rolePermissionResult) return rolePermissionResult;

      // Find matching mock data
      for (const [key, data] of Object.entries(mockData)) {
        if (query.toLowerCase().includes(key.toLowerCase().split('?')[0].trim())) {
          return data;
        }
      }

      // Return empty array for unhandled queries
      return [] as MockResult[];
    },
    {
      // Raw parameterized form (`sql.query(text, values)`), which the chat
      // helpers use for counter updates. Non-chat statements stay unhandled and
      // return an empty result set rather than throwing.
      query: async (text: string, values: unknown[] = []) => {
        console.info('[MOCK SQL:query]', text, values);
        return runChatQuery(text, values) ?? ([] as MockResult[]);
      },
    }
  );
}
