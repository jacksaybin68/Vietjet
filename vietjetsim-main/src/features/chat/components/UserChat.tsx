'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/shared/components/ui';

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

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export default function UserChat() {
  const { user } = useAuth();

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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark admin messages as read
  const markAdminMessagesRead = useCallback(
    async (convId: string) => {
      if (!user) return;
      try {
        await fetchAPI('/chat/mark-read', {
          method: 'POST',
          body: JSON.stringify({ conversation_id: convId }),
        });
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
      const data = await fetchAPI('/chat/conversations');
      if (data.conversation) {
        setConversation(data.conversation);
        setUnreadCount(data.conversation.unread_by_user || 0);
        const msgsData = await fetchAPI(`/chat?conversation_id=${data.conversation.id}`);
        setMessages(msgsData.messages || []);
        lastMessageCountRef.current = (msgsData.messages || []).length;
      }
    } catch (err) {
      console.error('Load conversation error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createConversation = useCallback(async () => {
    if (!user) return null;
    try {
      const data = await fetchAPI('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.fullName || user.email?.split('@')[0] || 'Khách hàng',
          last_message: '',
          unread_by_admin: 0,
          unread_by_user: 0,
        }),
      });
      if (data.conversation) {
        setConversation(data.conversation);
        return data.conversation as Conversation;
      }
      return null;
    } catch (err) {
      console.error('Create conversation error:', err);
      return null;
    }
  }, [user]);

  // Poll for new messages
  const pollMessages = useCallback(async () => {
    if (!conversation?.id) return;
    try {
      const data = await fetchAPI(`/chat?conversation_id=${conversation.id}`);
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
    } catch (err) {
      console.error('Poll messages error:', err);
    }
  }, [conversation?.id, isOpen]);

  // Poll for presence
  const pollPresence = useCallback(async () => {
    if (!conversation?.id) return;
    try {
      const data = await fetchAPI(`/chat/presence?conversation_id=${conversation.id}`);
      if (data.presence) {
        setAdminOnline(data.presence.is_online ?? false);
        setAdminTyping(data.presence.is_typing ?? false);
      }
    } catch (err) {
      console.error('Poll presence error:', err);
    }
  }, [conversation?.id]);

  // Load conversation on mount
  useEffect(() => {
    if (user) {
      loadConversation();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (presencePollingRef.current) clearInterval(presencePollingRef.current);
    };
  }, [user, loadConversation]);

  // Start polling when conversation is loaded
  useEffect(() => {
    if (conversation?.id) {
      pollingRef.current = setInterval(pollMessages, 3000);
      presencePollingRef.current = setInterval(pollPresence, 3000);
      // Initial poll
      pollMessages();
      pollPresence();
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (presencePollingRef.current) clearInterval(presencePollingRef.current);
    };
  }, [conversation?.id, pollMessages, pollPresence]);

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
    fetchAPI('/chat/typing', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversation.id, is_typing: true }),
    }).catch(() => {});

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetchAPI('/chat/typing', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: conversation.id, is_typing: false }),
      }).catch(() => {});
    }, 2000);
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending || !user) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Clear typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (conversation?.id) {
      fetchAPI('/chat/typing', {
        method: 'POST',
        body: JSON.stringify({ conversation_id: conversation.id, is_typing: false }),
      }).catch(() => {});
    }

    try {
      let conv = conversation;
      if (!conv) {
        conv = await createConversation();
        if (!conv) return;
      }

      await fetchAPI('/chat', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conv.id,
          sender_id: user.id,
          sender_role: 'user',
          content: text,
        }),
      });

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

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-vj ring-1 ring-white/40 shadow-vj-btn-hover transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] active:scale-95 sm:right-6 touch-manipulation"
        aria-label={isOpen ? 'Đóng chat hỗ trợ' : 'Mở chat hỗ trợ'}
      >
        <Icon
          name={isOpen ? 'XMarkIcon' : 'ChatBubbleLeftRightIcon'}
          size={24}
          className="text-white"
        />
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-navy text-xs font-black shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(680px,100dvh)] flex-col overflow-hidden rounded-t-[28px] border border-white/60 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:w-[400px] sm:rounded-[28px]"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-primary to-accent" />
          {/* Header */}
          <div className="relative flex flex-shrink-0 items-center gap-3 overflow-hidden bg-gradient-vj px-4 py-4 text-white sm:px-5">
            <div className="absolute -right-10 -top-16 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-10 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/25">
              <Icon name="ChatBubbleLeftRightIcon" size={22} className="text-accent" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[#E31E24] ${
                  adminOnline ? 'bg-green-400' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="truncate text-sm font-bold leading-tight">Hỗ trợ Vietjet Air</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${adminOnline ? 'bg-green-400' : 'bg-gray-400'} ${
                    adminOnline ? 'animate-pulse' : ''
                  }`}
                />
                <span className="text-xs text-white/80">
                  {adminTyping ? (
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
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <Icon name="ChatBubbleLeftRightIcon" size={28} className="text-primary" />
                </div>
                <div>
                  <p className="text-navy font-semibold text-sm">Xin chào! 👋</p>
                  <p className="text-gray-500 text-xs mt-1">Hãy gửi tin nhắn để được hỗ trợ</p>
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
                            ? 'bg-primary text-white rounded-br-sm dark:bg-primary-dark'
                            : 'bg-gray-100 text-navy border border-gray-200 rounded-bl-sm shadow-sm dark:bg-gray-700 dark:border-gray-600'
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

          {/* Input */}
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
                onClick={handleSend}
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
        </div>
      )}
    </>
  );
}
