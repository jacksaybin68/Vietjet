import { sql } from '@/lib/neon';
import type { ChatConversationRecord, ChatMessageRecord, ChatPresenceRecord } from './types';

// ─── Chat Queries ───────────────────────────────────────────────────────────

export async function getOrCreateConversation(
  userId: string,
  userEmail: string,
  userName: string
): Promise<ChatConversationRecord> {
  const existing = await sql`
    SELECT * FROM chat_conversations
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if ((existing as any[]).length > 0) {
    return (existing as ChatConversationRecord[])[0];
  }

  const results = await sql`
    INSERT INTO chat_conversations (user_id, user_email, user_name)
    VALUES (${userId}, ${userEmail}, ${userName})
    RETURNING *
  `;
  return (results as ChatConversationRecord[])[0];
}

export async function getAllConversations(params?: {
  page?: number;
  limit?: number;
}): Promise<{ conversations: ChatConversationRecord[]; total: number }> {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  const conversations = await sql`
    SELECT * FROM chat_conversations
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult = await sql`SELECT COUNT(*) as total FROM chat_conversations`;
  const total = parseInt((countResult as any)[0].total, 10);

  return { conversations: conversations as ChatConversationRecord[], total };
}

export async function getConversationMessages(
  conversationId: string,
  params?: { page?: number; limit?: number }
): Promise<ChatMessageRecord[]> {
  const page = params?.page || 1;
  const limit = params?.limit || 100;
  const offset = (page - 1) * limit;

  return (await sql`
    SELECT * FROM chat_messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `) as ChatMessageRecord[];
}

export async function sendChatMessage(message: {
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  content: string;
}): Promise<ChatMessageRecord> {
  const results = await sql`
    INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content)
    VALUES (${message.conversation_id}, ${message.sender_id}, ${message.sender_role}, ${message.content})
    RETURNING *
  `;

  const validRoles: ReadonlyArray<string> = ['user', 'admin'];
  const safeRole = validRoles.includes(message.sender_role) ? message.sender_role : 'user';
  const unreadField = safeRole === 'user' ? 'unread_by_admin' : 'unread_by_user';

  const updateQuery = `
    UPDATE chat_conversations
    SET last_message = $1,
        updated_at = NOW(),
        ${unreadField} = ${unreadField} + 1
    WHERE id = $2
  `;
  await sql.query(updateQuery, [message.content, message.conversation_id]);

  return (results as ChatMessageRecord[])[0];
}

export async function getChatPresence(
  conversationId: string,
  role: 'user' | 'admin'
): Promise<ChatPresenceRecord | null> {
  const results = await sql`
    SELECT * FROM chat_presence
    WHERE conversation_id = ${conversationId} AND role = ${role}
  `;
  return (results as ChatPresenceRecord[])[0] || null;
}

export async function updateChatPresence(
  userId: string,
  conversationId: string,
  role: 'user' | 'admin',
  updates: { is_online?: boolean; is_typing?: boolean }
): Promise<ChatPresenceRecord> {
  const existing = await getChatPresence(conversationId, role);

  if (existing) {
    const results = await sql`
      UPDATE chat_presence
      SET is_online = COALESCE(${updates.is_online}, is_online),
          is_typing = COALESCE(${updates.is_typing}, is_typing),
          last_seen = NOW(),
          updated_at = NOW()
      WHERE conversation_id = ${conversationId} AND role = ${role}
      RETURNING *
    `;
    return (results as ChatPresenceRecord[])[0];
  }

  const results = await sql`
    INSERT INTO chat_presence (user_id, conversation_id, role, is_online, is_typing)
    VALUES (${userId}, ${conversationId}, ${role}, ${updates.is_online || false}, ${updates.is_typing || false})
    RETURNING *
  `;
  return (results as ChatPresenceRecord[])[0];
}
