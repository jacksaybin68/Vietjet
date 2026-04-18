'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  created_at: string;
}

export default function OpenClawAssistant() {
  const { isAdmin, user } = useAuth();
  const pathname = usePathname();
  const isInsideAdmin = pathname?.startsWith('/admin-dashboard');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (!isAdmin || !isInsideAdmin) return null;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        // Welcoming message - Dedicated Coordinator Focus
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            content: `Xin chào${user?.fullName ? ` ${user.fullName}` : ''}! Tôi là **OpenClaw Coordinator**. Hệ thống hiện đang ở chế độ chuyên biệt: **Điều phối cập nhật chặng bay thực tế**. Tôi sẽ giúp bạn tra cứu, đồng bộ và quản lý các lộ trình bay từ Vietjet Air vào hệ thống quản trị.`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }
  }, [isOpen, user?.fullName, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/openclaw/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          id: data.id || Date.now().toString(),
          sender: 'ai',
          content: data.content,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('OpenClaw Chat Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          content: 'Xin lỗi, đã có lỗi xảy ra khi kết nối với máy chủ AI. Vui lòng thử lại sau.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setIsTyping(false);
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

  return (
    <>
      {/* Floating Assistant Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-vj-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group ${isOpen ? 'bg-navy rotate-90' : 'bg-gradient-red overflow-hidden'}`}
        aria-label="OpenClaw Assistant"
      >
        {!isOpen && (
          <div className="absolute inset-0 bg-white/20 animate-pulse group-hover:bg-transparent transition-colors" />
        )}
        <Icon
          name={isOpen ? 'XMarkIcon' : 'SparklesIcon'}
          size={24}
          className="text-white relative z-10"
        />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 shadow-glow-red"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent border border-white"></span>
          </span>
        )}
      </button>

      {/* Assistant Window */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white shadow-2xl flex flex-col overflow-hidden border border-gray-100 backdrop-blur-md rounded-t-2xl sm:rounded-2xl bottom-0 right-0 left-0 sm:bottom-40 sm:right-6 sm:left-auto sm:w-[420px]`}
          style={{ maxHeight: '75vh', height: '600px' }}
        >
          {/* AI Header */}
          <div className="bg-gradient-vj px-5 py-4 flex items-center gap-4 flex-shrink-0 relative overflow-hidden">
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />

            <div className="relative w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
              <Icon name="SparklesIcon" size={24} className="text-accent" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-primary-dark" />
            </div>

            <div className="flex-1">
              <div className="text-white font-heading font-bold text-lg flex items-center gap-2">
                OpenClaw Assistant
                <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded border border-accent/30 font-medium">
                  BETA AI
                </span>
              </div>
              <div className="text-white/70 text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Đang trực tuyến (AI được cá nhân hóa)
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl flex items-center justify-center transition-colors border border-white/10"
            >
              <Icon name="ChevronDownIcon" size={20} className="text-white" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-[#F8F9FB] custom-scrollbar">
            {messages.map((msg) => {
              const IsAi = msg.sender === 'ai';
              return (
                <div key={msg.id} className={`flex flex-col ${IsAi ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] relative ${IsAi ? 'pl-2' : 'pr-2'}`}>
                    <div
                      className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm font-sans ${
                        IsAi
                          ? 'bg-white text-navy border-l-4 border-l-accent rounded-tl-none'
                          : 'bg-primary text-white rounded-tr-none'
                      }`}
                    >
                      {/* Using dangerouslySetInnerHTML for markdown-ish content since I don't want to add a md lib unless asked */}
                      <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                    </div>
                    <div
                      className={`mt-1.5 flex items-center gap-2 opacity-60 ${IsAi ? 'justify-start' : 'justify-end'}`}
                    >
                      <span className="text-[10px] font-medium tracking-wider uppercase text-gray-400">
                        {IsAi ? 'OpenClaw v1.2' : 'You'}
                      </span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className="text-[10px] text-gray-400">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start bg-white/50 backdrop-blur-sm self-start px-4 py-3 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                  <span className="text-xs text-gray-400 ml-2 font-medium">
                    Assistant is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* AI Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-vj rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-500" />
              <div className="relative flex items-center gap-3 bg-gray-50/50 rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-accent focus-within:bg-white transition-all shadow-inner">
                <input
                  id="openclaw-input"
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi trợ lý OpenClaw..."
                  className="flex-1 bg-transparent text-sm text-navy placeholder:text-gray-400 outline-none font-medium"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="w-10 h-10 bg-navy hover:bg-primary text-white rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-20 disabled:grayscale"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Icon name="PaperAirplaneIcon" size={18} />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-center text-gray-400">
              Cung cấp bởi công nghệ <span className="text-navy font-bold">OpenClaw Engine</span> •
              Dữ liệu cập nhật 2026
            </p>
          </div>
        </div>
      )}

      {/* Global CSS for scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </>
  );
}
