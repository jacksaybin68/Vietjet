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

/** Câu trả lời của trợ lý admin, kèm backend đã phục vụ lượt chat. */
export interface AssistantReply {
  content: string;
  id: string;
  provider?: 'ollama' | 'openclaw';
  model?: string | null;
}

/** Trạng thái backend của trợ lý (Ollama chạy local hay gateway OpenClaw). */
export interface AssistantStatus {
  provider: 'ollama' | 'openclaw';
  model: string | null;
  openclaw: { url: string; configured: boolean };
  ollama: {
    baseUrl: string;
    model: string;
    configured: boolean;
    reachable: boolean;
    models: string[];
  };
}

/** Admin-only: agentic flight-research assistant. */
export function askAssistant(
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<AssistantReply> {
  return apiRequest<AssistantReply>(CHAT.ASSISTANT, {
    method: 'POST',
    body: { message, history },
  });
}

/**
 * Admin-only: backend nào đang phục vụ trợ lý và Ollama có model gì.
 * Dùng để hiển thị engine trên widget và để kiểm tra cấu hình.
 */
export function getAssistantStatus(): Promise<AssistantStatus> {
  return apiRequest<AssistantStatus>(CHAT.ASSISTANT);
}

/** Admin-only: close or reopen a support thread. */
export function setConversationStatus(
  conversationId: string,
  status: 'active' | 'closed'
): Promise<{ success: boolean; conversation: ChatConversation }> {
  return apiRequest(CHAT.CONVERSATIONS, {
    method: 'PATCH',
    body: { conversation_id: conversationId, status },
  });
}
