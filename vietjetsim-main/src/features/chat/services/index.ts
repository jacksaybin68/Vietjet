import { apiRequest } from '@/shared/services';
import { API_ENDPOINTS } from '@/shared/constants';

const { CHAT } = API_ENDPOINTS;

export interface ChatConversation {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  status: string;
  last_message: string | null;
  unread_by_user: number;
  unread_by_admin: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatPresence {
  is_online: boolean;
  is_typing: boolean;
}

/** Conversations visible to the caller (one for users, all for admins). */
export function listConversations(): Promise<{ conversations: ChatConversation[] }> {
  return apiRequest(CHAT.CONVERSATIONS);
}

export function getConversationMessages(
  conversationId: string
): Promise<{ messages: ChatMessage[] }> {
  return apiRequest(`${CHAT.MESSAGES}?conversationId=${encodeURIComponent(conversationId)}`);
}

export function sendChatMessage(
  conversationId: string,
  content: string
): Promise<{ success: boolean; message: ChatMessage }> {
  return apiRequest(CHAT.MESSAGES, {
    method: 'POST',
    body: { conversation_id: conversationId, content },
  });
}

export function getChatPresence(
  conversationId: string
): Promise<{ presence: ChatPresence | null }> {
  return apiRequest(`${CHAT.PRESENCE}?conversationId=${encodeURIComponent(conversationId)}`);
}

export function updateChatPresence(
  conversationId: string,
  updates: { is_online?: boolean; is_typing?: boolean }
): Promise<{ success: boolean }> {
  return apiRequest(CHAT.PRESENCE, {
    method: 'POST',
    body: { conversationId, ...updates },
  });
}

export function markConversationRead(conversationId: string): Promise<{ success: boolean }> {
  return apiRequest(CHAT.MARK_READ, {
    method: 'POST',
    body: { conversation_id: conversationId },
  });
}
