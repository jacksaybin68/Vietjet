'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';
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
const _QUICK_REPLIES = [
  { icon: 'TicketIcon', label: 'Tra cứu vé đã đặt' },
  { icon: 'BriefcaseIcon', label: 'Quy định hành lý' },
  { icon: 'ArrowPathIcon', label: 'Đổi ngày bay' },
  { icon: 'ReceiptRefundIcon', label: 'Hoàn / hủy vé' },
];

/** localStorage key holding the dragged launcher position, in viewport pixels. */
const LAUNCHER_POS_KEY = 'vj-chat-launcher-pos';
/** Fallback launcher box size (px) used before the element has been measured. */
const LAUNCHER_SIZE = 80;
/** Gap kept between the launcher and every viewport edge, so it stays grabbable. */
const MARGIN = 8;

// ─── API ──────────────────────────────────────────────────────────────────────

import {
  listConversations,
  getConversationMessages,
  sendChatMessage as sendChatMessageRequest,
  getChatPresence,
  updateChatPresence,
  markConversationRead,
  initiateChatCall,
  getActiveChatCall,
  acceptChatCall,
  rejectChatCall,
  endChatCall,
  type ChatCall,
} from '../services';
import { playNewMessageChime } from '../services/callSounds';
import VoiceCallModal from './VoiceCallModal';

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

  // Voice call states
  const [activeCall, setActiveCall] = useState<ChatCall | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isCallConnecting, setIsCallConnecting] = useState(false);
  const [latestAdminMessagePreview, setLatestAdminMessagePreview] = useState<string | null>(null);
  const callPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestIdNumber, setGuestIdNumber] = useState('');
  const [guestUser, setGuestUser] = useState<{
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  } | null>(null);
  const [isGuestChatStarted, setIsGuestChatStarted] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [isStartingGuest, setIsStartingGuest] = useState(false);

  // Active user can be authenticated user or guest user who entered info
  const activeUser = useMemo(
    () =>
      user ? { id: user.id, fullName: user.fullName || user.email, phone: user.phone } : guestUser,
    [user, guestUser]
  );

  // Presence state
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);

  const handleStartGuestChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGuestError('');
    if (!guestName.trim()) {
      setGuestError('Vui lòng nhập Họ & Tên');
      return;
    }
    const cleanPhone = guestPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setGuestError('Vui lòng nhập Số điện thoại hợp lệ (9-11 chữ số)');
      return;
    }
    if (!guestIdNumber.trim()) {
      setGuestError('Vui lòng nhập Số CCCD');
      return;
    }

    setIsStartingGuest(true);
    try {
      const res = await fetch('/api/tro-chuyen/khach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: guestName.trim(),
          phone: cleanPhone,
          idNumber: guestIdNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuestError(data.message || 'Không thể bắt đầu trò chuyện');
        return;
      }
      if (data.user) {
        setGuestUser(data.user);
      }
      setIsGuestChatStarted(true);
      if (data.conversationId) {
        setConversation({
          id: data.conversationId,
          user_id: data.user?.id || 'guest',
          unread_by_user: 0,
        });
        const msgs = await getConversationMessages(data.conversationId);
        setMessages(msgs.messages || []);
      }
    } catch (err) {
      console.error(err);
      setGuestError('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsStartingGuest(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presencePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageCountRef = useRef(0);
  /** Set once a poll returns 401 so the rest of the cycle skips silently. */
  const authErrorRef = useRef(false);

  // ─── Draggable launcher ─────────────────────────────────────────────────────
  // The launcher sits bottom-right by default but can be dragged anywhere, so
  // it never covers a control the traveller needs (on the results page it used
  // to land on the sticky totals bar). The drop position is remembered per
  // browser; a stored position is discarded when the viewport shrinks so a
  // launcher parked on a wide screen cannot end up off-screen on a phone.
  const [launcherPos, setLauncherPos] = useState<{ x: number; y: number } | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /** Swallows the click that ends a drag, so a drag never opens the panel. */
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setLauncherPos(null);
  }, [isOpen]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAUNCHER_POS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { x: number; y: number };
      if (typeof saved?.x !== 'number' || typeof saved?.y !== 'number') return;
      // Off-screen after a viewport change? Fall back to the default corner.
      if (saved.x > window.innerWidth - MARGIN || saved.y > window.innerHeight - MARGIN) return;
      if (saved.x < 0 || saved.y < 0) return;
      setLauncherPos(saved);
    } catch {
      /* corrupt value — keep the default position */
    }
  }, []);

  const persistLauncherPos = (pos: { x: number; y: number } | null) => {
    try {
      if (pos) window.localStorage.setItem(LAUNCHER_POS_KEY, JSON.stringify(pos));
      else window.localStorage.removeItem(LAUNCHER_POS_KEY);
    } catch {
      /* private mode or quota — the position just will not persist */
    }
  };

  // The move/up listeners live on `window` for the duration of a drag rather
  // than on the button: repositioning the launcher under the pointer makes the
  // pointer leave the element, and a handler bound to the button would then
  // stop firing after the first step.
  const handleLauncherPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (isOpen) return;
    const el = launcherRef.current;
    const rect = el?.getBoundingClientRect();
    if (!el || !rect) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
    setIsDragging(true);

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== moveEvent.pointerId) return;
      drag.moved = true;
      const size = launcherRef.current?.offsetWidth ?? LAUNCHER_SIZE;
      const x = Math.min(
        Math.max(moveEvent.clientX - drag.offsetX, MARGIN),
        window.innerWidth - size - MARGIN
      );
      const y = Math.min(
        Math.max(moveEvent.clientY - drag.offsetY, MARGIN),
        window.innerHeight - size - MARGIN
      );
      setLauncherPos({ x, y });
    };

    const onUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== upEvent.pointerId) return;
      dragRef.current = null;
      setIsDragging(false);
      if (!drag.moved) return;
      // A drag must not also count as the tap that opens the panel.
      suppressClickRef.current = true;
      setLauncherPos((current) => {
        persistLauncherPos(current);
        return current;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleLauncherClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setIsOpen((open) => !open);
  };

  /** Cancel all poll timers (unmount, logout, or auth failure). */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (presencePollingRef.current) {
      clearInterval(presencePollingRef.current);
      presencePollingRef.current = null;
    }
    if (callPollingRef.current) {
      clearInterval(callPollingRef.current);
      callPollingRef.current = null;
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
      if (!activeUser) return;
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
    [activeUser]
  );

  // Load or create conversation
  const loadConversation = useCallback(async () => {
    if (!activeUser) return;
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
  }, [activeUser]);

  // The server derives the participant from the session cookie, so there is no
  // payload to send: fetching the list both finds and (for a first-time user)
  // creates the caller's conversation.
  const createConversation = useCallback(async () => {
    if (!activeUser) return null;
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
  }, [activeUser]);

  // Poll for new messages & audio notifications
  const pollMessages = useCallback(async () => {
    if (!conversation?.id || !activeUser || authErrorRef.current) return;
    try {
      const data = await getConversationMessages(conversation.id);
      const newMessages = data.messages || [];
      if (newMessages.length !== lastMessageCountRef.current) {
        setMessages(newMessages);
        const prevCount = lastMessageCountRef.current;
        lastMessageCountRef.current = newMessages.length;
        // Check for new admin messages
        const newAdminMsgs = newMessages.filter(
          (m: Message) => m.sender_role === 'admin' && !m.read_at
        );
        if (newAdminMsgs.length > 0 && prevCount > 0) {
          playNewMessageChime();
          if (!isOpen) {
            setUnreadCount((c) => c + newAdminMsgs.length);
            setLatestAdminMessagePreview(newAdminMsgs[newAdminMsgs.length - 1].content);
          }
        }
      }
      authErrorRef.current = false;
    } catch (err) {
      // Session gone: stop the loop instead of logging the same 401 every 3s.
      if (handleAuthError(err)) return;
      console.error('Poll messages error:', err);
    }
  }, [conversation?.id, isOpen, activeUser, handleAuthError]);

  // Poll for incoming voice call
  const pollCall = useCallback(async () => {
    if (!conversation?.id || !activeUser || authErrorRef.current) return;
    try {
      const data = await getActiveChatCall(conversation.id);
      const currentCall = data.call;
      if (currentCall) {
        setActiveCall(currentCall);
        if (currentCall.status === 'ringing') {
          setIsCallModalOpen(true);
        } else if (currentCall.status === 'ended' || currentCall.status === 'rejected') {
          setTimeout(() => {
            setIsCallModalOpen(false);
            setActiveCall(null);
          }, 1500);
        }
      } else {
        if (activeCall && (activeCall.status === 'ringing' || activeCall.status === 'connected')) {
          setActiveCall(null);
          setIsCallModalOpen(false);
        }
      }
    } catch (err) {
      if (handleAuthError(err)) return;
      console.error('Poll call error:', err);
    }
  }, [conversation?.id, activeUser, activeCall, handleAuthError]);

  const handleStartCall = async () => {
    if (!activeUser) return;
    let conv = conversation;
    if (!conv) {
      conv = await createConversation();
      if (!conv) return;
    }
    setIsCallConnecting(true);
    try {
      const res = await initiateChatCall(
        conv.id,
        user ? user.fullName || user.email : guestName || 'Khách hàng'
      );
      if (res.call) {
        setActiveCall(res.call);
        setIsCallModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to initiate call:', err);
    } finally {
      setIsCallConnecting(false);
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCall) return;
    try {
      const res = await acceptChatCall(activeCall.id);
      if (res.call) setActiveCall(res.call);
    } catch (err) {
      console.error('Accept call error:', err);
    }
  };

  const handleRejectCall = async () => {
    if (!activeCall) return;
    try {
      await rejectChatCall(activeCall.id, conversation?.id);
      setIsCallModalOpen(false);
      setActiveCall(null);
      pollMessages();
    } catch (err) {
      console.error('Reject call error:', err);
    }
  };

  const handleEndCall = async (durationSec: number) => {
    if (!activeCall) return;
    try {
      await endChatCall(activeCall.id, durationSec, conversation?.id);
      setIsCallModalOpen(false);
      setActiveCall(null);
      pollMessages();
    } catch (err) {
      console.error('End call error:', err);
    }
  };

  // Poll for presence
  const pollPresence = useCallback(async () => {
    if (!conversation?.id || !activeUser || authErrorRef.current) return;
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
  }, [conversation?.id, activeUser, handleAuthError]);

  // Load conversation on mount
  useEffect(() => {
    if (user) {
      loadConversation();
    }
    return () => stopPolling();
  }, [user, loadConversation, stopPolling]);

  // Start polling when conversation is loaded — and activeUser is present.
  useEffect(() => {
    if (conversation?.id && activeUser) {
      authErrorRef.current = false;
      pollingRef.current = setInterval(pollMessages, 3000);
      presencePollingRef.current = setInterval(pollPresence, 3000);
      callPollingRef.current = setInterval(pollCall, 2500);
      // Initial poll
      pollMessages();
      pollPresence();
      pollCall();
    }
    return () => stopPolling();
  }, [conversation?.id, activeUser, pollMessages, pollPresence, pollCall, stopPolling]);

  // Session lost mid-session: drop the conversation so polling stays off until
  // the user signs in again (the effect above only re-arms on a new `activeUser`).
  useEffect(() => {
    if (!activeUser && conversation) {
      setConversation(null);
      setMessages([]);
      setUnreadCount(0);
      lastMessageCountRef.current = 0;
    }
  }, [activeUser, conversation]);

  // Handle chat open/close
  useEffect(() => {
    if (!conversation?.id) return;
    if (isOpen) {
      markAdminMessagesRead(conversation.id);
      setUnreadCount(0);
      setLatestAdminMessagePreview(null);
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
    if (!text || sending || !activeUser) return;
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
          sender_id: activeUser.id,
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
          header owns the close button there. It can be dragged anywhere on the
          screen: once the user has moved it, `launcherPos` pins it to that point
          and the default corner classes drop away. A drag that never moved is
          treated as a tap, so clicking still opens the panel. */}
      <button
        ref={launcherRef}
        type="button"
        onClick={handleLauncherClick}
        onPointerDown={handleLauncherPointerDown}
        aria-label={isOpen ? 'Đóng chat hỗ trợ' : 'Mở chat hỗ trợ'}
        aria-expanded={isOpen}
        style={
          launcherPos
            ? { left: launcherPos.x, top: launcherPos.y, right: 'auto', bottom: 'auto' }
            : undefined
        }
        className={`fixed z-50 items-end touch-manipulation ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${
          launcherPos
            ? isOpen
              ? 'hidden sm:flex'
              : 'flex'
            : isOpen
              ? 'bottom-[calc(70px+env(safe-area-inset-bottom))] right-2 hidden sm:flex sm:bottom-4 sm:right-4'
              : 'bottom-[calc(70px+env(safe-area-inset-bottom))] right-2 flex transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 sm:bottom-4 sm:right-4'
        }`}
      >
        {isOpen ? (
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-vj text-white shadow-vj-btn-hover ring-1 ring-white/40">
            <Icon name="XMarkIcon" size={22} />
          </span>
        ) : (
          <span className="flex items-end gap-2">
            <span className="mb-7 hidden sm:inline-block whitespace-nowrap rounded-[8px] bg-white px-3.5 py-2 text-base2 font-bold text-[var(--foreground)] shadow-[0_6px_18px_rgba(0,0,0,0.16)] ring-1 ring-black/5">
              Xin chào!
            </span>
            <img
              src="/images/hero/amy-mascot.png"
              alt="Logo hỗ trợ Vietjet Air"
              width={86}
              height={96}
              className="h-[52px] w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)] sm:h-[92px]"
            />
          </span>
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-vjred px-1 text-xs font-black text-white shadow-vj-btn">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Floating preview toast when chat is closed and new message arrived */}
        {!isOpen && latestAdminMessagePreview && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
              setLatestAdminMessagePreview(null);
            }}
            className="absolute bottom-full right-0 mb-3 w-64 p-3 bg-white border border-red-200 rounded-2xl shadow-xl animate-fadeIn cursor-pointer hover:border-red-400 transition-all text-left z-50"
          >
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-3xs font-bold text-red-600 uppercase">
                  Tin nhắn từ Tổng đài
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLatestAdminMessagePreview(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed">
              {latestAdminMessagePreview}
            </p>
            <span className="text-3xs text-red-600 font-bold mt-1 inline-block hover:underline">
              Bấm để trả lời →
            </span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-50 flex h-[min(580px,calc(100dvh-72px))] flex-col overflow-hidden rounded-t-[24px] border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[620px] sm:w-[400px] sm:rounded-[24px]">
          {/* Header chuẩn Trợ lý ảo Amy */}
          <div className="relative flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-sm ring-1 ring-red-700">
                <span className="font-black text-2xs italic tracking-tighter">vietjet</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-red-600 font-koho text-sm sm:text-base leading-tight">
                    Vietjet Air 24/7
                  </h3>
                  <span
                    className={`h-2 w-2 rounded-full ${operatorOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                    title={operatorOnline ? 'Online' : 'Offline'}
                  />
                </div>
                <div className="text-3xs text-gray-400 leading-tight">Tổng đài Vietjet Air</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(!isGuest || isGuestChatStarted) && (
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={isCallConnecting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold transition-all shadow-2xs touch-manipulation active:scale-95"
                  title="Gọi thoại trực tiếp với tổng đài viên Vietjet 24/7"
                >
                  <Icon name="PhoneIcon" size={13} className="text-green-600" />
                  <span className="text-2xs sm:inline">Gọi điện</span>
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors font-black text-lg touch-manipulation"
                aria-label="Đóng chat hỗ trợ"
                title="Thu nhỏ"
              >
                —
              </button>
            </div>
          </div>

          {/* Messages & Chat Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-white via-gray-50/60 to-gray-50/90">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isGuest && !isGuestChatStarted ? (
              <div className="space-y-3 pt-1">
                {/* Form thông tin khách hàng không cần đăng nhập */}
                <form
                  onSubmit={handleStartGuestChat}
                  noValidate
                  className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-red-600 font-koho uppercase tracking-wider">
                      Thông tin khách hàng
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-2xs font-bold text-gray-700 mb-1">
                        Họ &amp; Tên : <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-gray-700 mb-1">
                        Số điện thoại : <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0912345678"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-gray-700 mb-1">
                        Số CCCD : <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={guestIdNumber}
                        onChange={(e) => setGuestIdNumber(e.target.value)}
                        placeholder="001201012345"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white transition-all"
                        required
                      />
                    </div>

                    {guestError && (
                      <p className="text-2xs text-red-600 font-medium">{guestError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isStartingGuest}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg shadow-sm transition-colors mt-1"
                    >
                      {isStartingGuest ? 'Đang kết nối...' : 'Bắt đầu trò chuyện'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-center space-y-1">
                    <p className="text-3xs text-gray-500">
                      Đăng nhập để trò chuyện cùng tổng đài viên và xem lại lịch sử hỗ trợ của bạn.
                    </p>
                    <Link
                      href="/dang-nhap?redirect=/trang-chu"
                      className="text-2xs font-bold text-red-600 hover:underline inline-block"
                    >
                      Đăng nhập để trò chuyện
                    </Link>
                  </div>
                </form>
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-3 pt-1">
                {/* Thẻ thông tin khách hàng nếu có */}
                {(guestName || user) && (
                  <div className="bg-white rounded-xl border border-red-100 p-3 shadow-xs space-y-1 text-2xs text-gray-700">
                    <div className="font-bold text-red-600 uppercase text-3xs">
                      Thông tin đã ghi nhận:
                    </div>
                    <div>
                      Họ &amp; Tên :{' '}
                      <strong className="text-gray-900">{guestName || user?.fullName}</strong>
                    </div>
                    {(guestPhone || user?.phone) && (
                      <div>
                        Số điện thoại :{' '}
                        <strong className="text-gray-900">{guestPhone || user?.phone}</strong>
                      </div>
                    )}
                    {guestIdNumber && (
                      <div>
                        Số CCCD : <strong className="text-gray-900">{guestIdNumber}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Lời chào 2 */}
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm p-3 text-xs text-gray-800 leading-relaxed shadow-xs max-w-[85%]">
                    Is there anything else I can help you with?
                  </div>
                </div>

                {/* Danh sách câu hỏi gợi ý dạng pills viền đỏ */}
                <div className="flex flex-col items-end space-y-2 pt-1">
                  {[
                    'Online procedure times',
                    'Online flight procedures',
                    'How to find the best prices when purchasing Vietjet flights',
                    'Canceling pre-ordered meals',
                    'Quy định hành lý',
                    'Tra cứu vé đã đặt',
                  ].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSend(label)}
                      className="rounded-full border border-red-200 bg-white px-3.5 py-1.5 text-2xs font-medium text-red-600 shadow-xs hover:bg-red-50 hover:border-red-300 transition-colors text-right"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Rate the service quality card */}
                <div className="bg-gray-100/80 rounded-2xl p-3.5 border border-gray-200/60 space-y-1.5 shadow-xs">
                  <h4 className="font-bold text-xs text-gray-900">Rate the service quality</h4>
                  <p className="text-2xs text-gray-600 leading-relaxed">
                    With the desire to provide the best service experience for our customers, please
                    help Amy by rating the quality of the support service. Your feedback is
                    extremely valuable to Amy.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSend('Đánh giá dịch vụ 5 sao')}
                    className="text-2xs font-bold text-red-600 hover:underline pt-1 block"
                  >
                    Send feedback to Amy
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.sender_role === 'user';

                // Display call logs as special status pills
                if (msg.content.startsWith('📞')) {
                  const isMissed = msg.content.includes('nhỡ') || msg.content.includes('từ chối');
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-medium border shadow-2xs ${
                          isMissed
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-green-50 border-green-200 text-green-800'
                        }`}
                      >
                        <Icon
                          name={isMissed ? 'PhoneXMarkIcon' : 'PhoneIcon'}
                          size={13}
                          className={isMissed ? 'text-red-500' : 'text-green-600'}
                        />
                        <span>{msg.content}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="relative w-7 h-7 bg-red-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1 text-white text-3xs font-black italic">
                        vj
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}
                    >
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed select-text whitespace-pre-wrap touch-manipulation ${
                          isUser
                            ? 'bg-red-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 border border-gray-200/80 rounded-bl-sm shadow-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div
                        className={`flex items-center gap-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <span className="text-3xs text-gray-400">{formatTime(msg.created_at)}</span>
                        {isUser && (
                          <span title={msg.read_at ? 'Đã xem' : 'Đã gửi'}>
                            {msg.read_at ? (
                              <Icon name="CheckCircleIcon" size={12} className="text-blue-500" />
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
                <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1 text-white text-3xs font-black italic">
                  vj
                </div>
                <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-sm shadow-xs px-3.5 py-2.5 flex items-center gap-1">
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

          {/* Composer — khi đã đăng nhập hoặc khách đã bấm Bắt đầu trò chuyện */}
          {(!isGuest || isGuestChatStarted) && (
            <div className="relative px-3 pt-2 pb-2 bg-white border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5 border border-gray-200 focus-within:border-red-400 focus-within:bg-white transition-all shadow-xs">
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 px-1 py-0.5"
                  title="Menu"
                >
                  <span className="text-xs font-bold leading-none select-none">☰</span>
                </button>
                <input
                  id="chat-message-input"
                  name="message"
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent text-xs text-gray-900 placeholder-gray-400 outline-none min-w-0 py-1"
                  disabled={sending}
                />
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Đính kèm"
                >
                  <Icon name="PaperClipIcon" size={16} />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || sending}
                  className="text-red-600 disabled:text-gray-300 p-1 hover:scale-105 transition-transform"
                  title="Gửi"
                >
                  {sending ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon name="PaperAirplaneIcon" size={16} className="rotate-45" />
                  )}
                </button>
              </div>

              {/* Footer text & Vietjet swoosh */}
              <div className="mt-1 flex items-center justify-center text-3xs text-gray-400 gap-1 select-none">
                <span>Vietjet Air</span>
                <span className="font-bold text-red-600">VinBigdata</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice Call Modal */}
      <VoiceCallModal
        isOpen={isCallModalOpen}
        call={activeCall}
        currentRole="user"
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
      />
    </>
  );
}
