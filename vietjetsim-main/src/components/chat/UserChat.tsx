'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';

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
        className="fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation"
        aria-label="Mở chat hỗ trợ"
      >
        <Icon
          name={isOpen ? 'XMarkIcon' : 'ChatBubbleLeftRightIcon'}
          size={24}
          className="text-white"
        />
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-navy text-xs font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 bg-white shadow-2xl flex flex-col overflow-hidden border border-gray-100
            bottom-0 right-0 left-0 rounded-t-2xl
            sm:bottom-24 sm:right-6 sm:left-auto sm:w-96 sm:rounded-2xl"
          style={{ maxHeight: '85vh', height: '520px' }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="relative w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Icon name="UserIcon" size={18} className="text-white" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-primary ${
                  adminOnline ? 'bg-green-400' : 'bg-gray-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-sm">Hỗ trợ VietjetSim</div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${adminOnline ? 'bg-green-400' : 'bg-gray-400'}`}
                />
                <span className="text-white/70 text-xs">
                  {adminTyping ? (
                    <span className="text-white/90 font-medium">Đang nhập...</span>
                  ) : adminOnline ? (
                    'Trực tuyến'
                  ) : (
                    'Ngoại tuyến'
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full flex items-center justify-center transition-colors touch-manipulation"
            >
              <Icon name="XMarkIcon" size={16} className="text-white" />
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
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-white text-navy border border-gray-100 rounded-bl-sm shadow-sm'
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
