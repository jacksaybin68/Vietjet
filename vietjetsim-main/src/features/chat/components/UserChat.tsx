'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Icon, Mascot } from '@/shared/components/ui';
import { ApiRequestError } from '@/shared/services/apiClient';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  user_id: string;
  unread_by_user: number;
}

/** Suggested openers in the welcome state — the chip row vietjetair.com's chat shows. */
const QUICK_REPLIES = [
  { icon: 'TicketIcon', label: 'Tra cứu vé đã đặt' },
  { icon: 'BriefcaseIcon', label: 'Quy định hành lý' },
  { icon: 'ArrowPathIcon', label: 'Đổi ngày bay' },
  { icon: 'ReceiptRefundIcon', label: 'Hoàn / hủy vé' },
];

// ─── API ──────────────────────────────────────────────────────────────────────

import {
  listConversations,
  getConversationMessages,
  sendChatMessage as sendChatMessageRequest,
  getChatPresence,
  updateChatPresence,
  markConversationRead,
} from '../services';

export default function UserChat() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Presence state
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presencePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageCountRef = useRef(0);
  /** Set once a poll returns 401 so the rest of the cycle skips silently. */
  const authErrorRef = useRef(false);

  /** Cancel both poll timers (unmount, logout, or auth failure). */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (presencePollingRef.current) {
      clearInterval(presencePollingRef.current);
      presencePollingRef.current = null;
    }
  }, []);

  /**
   * True when the failure is a lost session (401/403 or "Authentication
   * required"). The caller then stops polling instead of logging every 3s.
   */
  const handleAuthError = useCallback(
    (err: unknown) => {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      const message = err instanceof Error ? err.message : '';
      const isAuthFailure =
        status === 401 || status === 403 || /authentication required|unauthorized/i.test(message);
      if (!isAuthFailure) return false;
      if (!authErrorRef.current) {
        console.warn('Chat polling stopped: session no longer valid');
        authErrorRef.current = true;
      }
      stopPolling();
      return true;
    },
    [stopPolling]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark admin messages as read
  const markAdminMessagesRead = useCallback(
    async (convId: string) => {
      if (!user) return;
      try {
        await markConversationRead(convId);
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_role === 'admin' && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          )
        );
      } catch (err) {
        console.error('Mark read error:', err);
      }
    },
    [user]
  );

  // Load or create conversation
  const loadConversation = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await listConversations();
      const conversation = data.conversations?.[0];
      if (conversation) {
        setConversation(conversation);
        setUnreadCount(conversation.unread_by_user || 0);
        const msgsData = await getConversationMessages(conversation.id);
        setMessages(msgsData.messages || []);
        lastMessageCountRef.current = (msgsData.messages || []).length;
      }
    } catch (err) {
      console.error('Load conversation error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // The server derives the participant from the session cookie, so there is no
  // payload to send: fetching the list both finds and (for a first-time user)
  // creates the caller's conversation.
  const createConversation = useCallback(async () => {
    if (!user) return null;
    try {
      const data = await listConversations();
      const existing = data.conversations?.[0];
      if (existing) {
        setConversation(existing);
        return existing as Conversation;
      }
      return null;
    } catch (err) {
      console.error('Create conversation error:', err);
      return null;
    }
  }, [user]);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!conversation?.id || !user || authErrorRef.current) return;
    try {
      const data = await getConversationMessages(conversation.id);
      const newMessages = data.messages || [];
      if (newMessages.length !== lastMessageCountRef.current) {
        setMessages(newMessages);
        lastMessageCountRef.current = newMessages.length;
        // Check for new admin messages
        const newAdminMsgs = newMessages.filter(
          (m: Message) => m.sender_role === 'admin' && !m.read_at
        );
        if (newAdminMsgs.length > 0 && !isOpen) {
          setUnreadCount((c) => c + newAdminMsgs.length);
        }
      }
      authErrorRef.current = false;
    } catch (err) {
      // Session gone: stop the loop instead of logging the same 401 every 3s.
      if (handleAuthError(err)) return;
      console.error('Poll messages error:', err);
    }
  }, [conversation?.id, isOpen, user, handleAuthError]);

  // Poll for presence
  const pollPresence = useCallback(async () => {
    if (!conversation?.id || !user || authErrorRef.current) return;
    try {
      const data = await getChatPresence(conversation.id);
      if (data.presence) {
        setAdminOnline(data.presence.is_online ?? false);
        setAdminTyping(data.presence.is_typing ?? false);
      }
      authErrorRef.current = false;
    } catch (err) {
      if (handleAuthError(err)) return;
      console.error('Poll presence error:', err);
    }
  }, [conversation?.id, user, handleAuthError]);

  // Load conversation on mount
  useEffect(() => {
    if (user) {
      loadConversation();
    }
    return () => stopPolling();
  }, [user, loadConversation, stopPolling]);

  // Start polling when conversation is loaded — and only while signed in.
  useEffect(() => {
    if (conversation?.id && user) {
      authErrorRef.current = false;
      pollingRef.current = setInterval(pollMessages, 3000);
      presencePollingRef.current = setInterval(pollPresence, 3000);
      // Initial poll
      pollMessages();
      pollPresence();
    }
    return () => stopPolling();
  }, [conversation?.id, user, pollMessages, pollPresence, stopPolling]);

  // Session lost mid-session: drop the conversation so polling stays off until
  // the user signs in again (the effect above only re-arms on a new `user`).
  useEffect(() => {
    if (!user && conversation) {
      setConversation(null);
      setMessages([]);
      setUnreadCount(0);
      lastMessageCountRef.current = 0;
    }
  }, [user, conversation]);

  // Handle chat open/close
  useEffect(() => {
    if (!conversation?.id) return;
    if (isOpen) {
      markAdminMessagesRead(conversation.id);
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, conversation?.id, markAdminMessagesRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, adminTyping, scrollToBottom]);

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!conversation?.id) return;

    // Send typing indicator via API
    updateChatPresence(conversation.id, { is_typing: true }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateChatPresence(conversation.id, { is_typing: false }).catch(() => {});
    }, 2000);
  };

  // `override` lets the quick-reply chips send their own copy of the text.
  const handleSend = async (override?: string) => {
    const text = (override ?? inputText).trim();
    if (!text || sending || !user) return;
    setInputText('');
    setSending(true);

    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (conversation?.id) {
      updateChatPresence(conversation.id, { is_typing: false }).catch(() => {});
    }

    try {
      let conv = conversation;
      if (!conv) {
        conv = await createConversation();
        if (!conv) return;
      }

      await sendChatMessageRequest(conv.id, text);

      // Optimistically update messages
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          conversation_id: conv!.id,
          sender_id: user.id,
          sender_role: 'user',
          content: text,
          created_at: new Date().toISOString(),
          read_at: null,
        },
      ]);
      lastMessageCountRef.current += 1;
    } catch (err) {
      console.error('Send error:', err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // The admin console has its own chat surface (ChatTab) plus the AI assistant
  // widget — never stack the user widget on top of it.
  if (pathname?.startsWith('/quan-tri')) return null;

  // Signed-out visitors get the same launcher vietjetair.com shows to everyone;
  // opening it asks them to sign in instead of showing an empty thread.
  const isGuest = !user;
  const operatorOnline = !isGuest && adminOnline;

  return (
    <>
      {/* Launcher — local Vietjet Air support logo with its "Xin chào!" bubble.
          While the panel is open on mobile it steps aside, because the panel
          header owns the close button there. */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Đóng chat hỗ trợ' : 'Mở chat hỗ trợ'}
        aria-expanded={isOpen}
        className={`fixed bottom-0 right-2 z-50 items-end transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 sm:right-6 touch-manipulation ${
          isOpen ? 'hidden sm:flex' : 'flex'
        }`}
      >
        {isOpen ? (
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-vj text-white shadow-vj-btn-hover ring-1 ring-white/40">
            <Icon name="XMarkIcon" size={22} />
          </span>
        ) : (
          <span className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
            <img
              src="/assets/images/app_logo.png"
              alt="Logo hỗ trợ Vietjet Air"
              width={80}
              height={80}
              className="h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
            />
            <span className="absolute -top-9 right-0 whitespace-nowrap rounded-2xl rounded-br-sm bg-white px-3 py-1.5 text-[13px] font-bold text-[var(--vj-navy)] shadow-[0_6px_18px_rgba(0,0,0,0.16)] ring-1 ring-black/5">
              Xin chào!
            </span>
          </span>
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-vjred px-1 text-xs font-black text-white shadow-vj-btn">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[min(680px,100dvh)] flex-col overflow-hidden rounded-t-[28px] border border-white/60 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:w-[400px] sm:rounded-[28px]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-primary to-accent" />
          {/* Header */}
          <div className="relative flex flex-shrink-0 items-center gap-3 overflow-hidden bg-gradient-vj px-4 py-4 text-white sm:px-5">
            <div className="absolute -right-10 -top-16 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-10 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/25">
              <Icon name="ChatBubbleLeftRightIcon" size={22} className="text-accent" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#EC2029] ${
                  operatorOnline ? 'bg-green-400' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="truncate text-sm font-bold leading-tight">
                {isGuest ? 'Tổng đài Vietjet Air' : 'Hỗ trợ Vietjet Air'}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${operatorOnline ? 'bg-green-400' : 'bg-gray-400'} ${
                    operatorOnline ? 'animate-pulse' : ''
                  }`}
                />
                <span className="text-xs text-white/80">
                  {isGuest ? (
                    'Đăng nhập để trò chuyện'
                  ) : adminTyping ? (
                    <span className="font-medium text-white">Đang nhập...</span>
                  ) : adminOnline ? (
                    'Sẵn sàng hỗ trợ'
                  ) : (
                    'Hiện đang ngoại tuyến'
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 active:bg-white/25 touch-manipulation"
              aria-label="Đóng chat hỗ trợ"
            >
              <Icon name="XMarkIcon" size={18} className="text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isGuest ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
                <Mascot greeting={null} className="h-28" />
                <div>
                  <p className="text-navy font-bold text-sm">Xin chào! 👋</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                    Đăng nhập để trò chuyện cùng tổng đài viên và xem lại lịch sử hỗ trợ của bạn.
                  </p>
                </div>
                <Link
                  href="/dang-nhap?redirect=/trang-chu"
                  className="vj-cta w-full max-w-[230px] px-5 text-sm"
                >
                  Đăng nhập để trò chuyện
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-full flex-col items-center justify-center gap-4 text-center">
                <Mascot greeting={null} className="h-28" />
                <div>
                  <p className="text-navy font-bold text-sm">
                    Xin chào{user?.fullName ? ` ${user.fullName}` : ''}! 👋
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Vietjet Air có thể hỗ trợ gì cho bạn?
                  </p>
                </div>
                <div className="w-full space-y-2">
                  {QUICK_REPLIES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSend(item.label)}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-navy transition-colors hover:border-primary hover:bg-red-50 touch-manipulation"
                    >
                      <Icon name={item.icon} size={16} className="text-primary" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender_role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="relative w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <Icon name="UserIcon" size={14} className="text-white" />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-50 ${
                            adminOnline ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}
                    >
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed select-text touch-manipulation ${
                          isUser
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-gray-100 text-navy border border-gray-200 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div
                        className={`flex items-center gap-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                        {isUser && (
                          <span title={msg.read_at ? 'Đã xem' : 'Đã gửi'}>
                            {msg.read_at ? (
                              <Icon name="CheckCircleIcon" size={12} className="text-blue-400" />
                            ) : (
                              <Icon name="CheckIcon" size={12} className="text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Admin typing indicator */}
            {adminTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <Icon name="UserIcon" size={14} className="text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer — signed-in users only; guests get the prompt in the body. */}
          {!isGuest && (
            <div className="px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 focus-within:border-primary transition-colors">
                <input
                  id="chat-message-input"
                  name="message"
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent text-sm text-navy placeholder-gray-400 outline-none min-w-0"
                  disabled={sending}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || sending}
                  className="w-10 h-10 bg-primary disabled:bg-gray-200 rounded-xl flex items-center justify-center transition-colors hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed flex-shrink-0 touch-manipulation"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon name="PaperAirplaneIcon" size={16} className="text-white" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
