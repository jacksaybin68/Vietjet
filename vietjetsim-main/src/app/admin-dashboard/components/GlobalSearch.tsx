'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SearchResult {
  type: 'flight' | 'user' | 'booking';
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
}

export default function GlobalSearch({ isOpen, onClose, onSelectResult }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'flight' | 'user' | 'booking'>(
    'all'
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const [flightsRes, usersRes, bookingsRes] = await Promise.all([
        fetch(`/api/admin/flights?q=${encodeURIComponent(searchQuery)}&limit=5`, {
          credentials: 'include',
        }),
        fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}&limit=5`, {
          credentials: 'include',
        }),
        fetch(`/api/admin/bookings?q=${encodeURIComponent(searchQuery)}&limit=5`, {
          credentials: 'include',
        }),
      ]);

      const newResults: SearchResult[] = [];

      if (flightsRes.ok) {
        const flightsData = await flightsRes.json();
        if (flightsData.flights && Array.isArray(flightsData.flights)) {
          flightsData.flights.slice(0, 5).forEach((flight: any) => {
            newResults.push({
              type: 'flight',
              id: flight.id,
              title: flight.flight_no || flight.flightNo || 'Unknown',
              subtitle: `${flight.from_code || flight.from || ''} → ${flight.to_code || flight.to || ''}`,
              status: flight.status,
            });
          });
        }
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.users && Array.isArray(usersData.users)) {
          usersData.users.slice(0, 5).forEach((user: any) => {
            newResults.push({
              type: 'user',
              id: user.id,
              title: user.full_name || user.name || user.email || 'Unknown',
              subtitle: user.email || '',
              status: user.role || user.status,
            });
          });
        }
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        if (bookingsData.bookings && Array.isArray(bookingsData.bookings)) {
          bookingsData.bookings.slice(0, 5).forEach((booking: any) => {
            newResults.push({
              type: 'booking',
              id: booking.id,
              title: booking.id || booking.booking_id || 'Unknown',
              subtitle: booking.route || `${booking.flight_no || ''}`,
              status: booking.status,
            });
          });
        }
      }

      setResults(newResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAll(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchAll]);

  const filteredResults =
    activeCategory === 'all' ? results : results.filter((r) => r.type === activeCategory);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelectResult(filteredResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult(result);
    onClose();
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'flight':
        return 'PaperAirplaneIcon';
      case 'user':
        return 'UsersIcon';
      case 'booking':
        return 'TicketIcon';
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'flight':
        return { bg: 'bg-red-100', text: 'text-red-600', label: 'Chuyến bay' };
      case 'user':
        return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Người dùng' };
      case 'booking':
        return { bg: 'bg-amber-100', text: 'text-amber-600', label: 'Đặt vé' };
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusMap: Record<string, { label: string; color: string }> = {
      active: { label: 'Hoạt động', color: 'bg-green-100 text-green-700' },
      confirmed: { label: 'Xác nhận', color: 'bg-green-100 text-green-700' },
      completed: { label: 'Hoàn thành', color: 'bg-blue-100 text-blue-700' },
      pending: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700' },
      cancelled: { label: 'Đã huỷ', color: 'bg-red-100 text-red-700' },
      delayed: { label: 'Trễ giờ', color: 'bg-orange-100 text-orange-700' },
      locked: { label: 'Khoá', color: 'bg-red-100 text-red-700' },
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
      super_admin: { label: 'Super Admin', color: 'bg-indigo-100 text-indigo-700' },
    };

    const config = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const categoryCounts = {
    all: results.length,
    flight: results.filter((r) => r.type === 'flight').length,
    user: results.filter((r) => r.type === 'user').length,
    booking: results.filter((r) => r.type === 'booking').length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Search Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          animation: 'scaleIn 0.2s ease-out',
        }}
        onKeyDown={handleKeyDown}
      >
        <style jsx>{`
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>

        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}
        >
          <Icon name="MagnifyingGlassIcon" size={20} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm chuyến bay, người dùng, đặt vé..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-base"
          />
          {isLoading && (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-medium text-slate-400 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Category Filters */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(148, 163, 184, 0.05)' }}
        >
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'flight', label: 'Chuyến bay' },
            { id: 'user', label: 'Người dùng' },
            { id: 'booking', label: 'Đặt vé' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id as any);
                setSelectedIndex(0);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {cat.label}
              {categoryCounts[cat.id as keyof typeof categoryCounts] > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeCategory === cat.id ? 'bg-white/20' : 'bg-slate-700'
                  }`}
                >
                  {categoryCounts[cat.id as keyof typeof categoryCounts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query && filteredResults.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(148, 163, 184, 0.1)' }}
              >
                <Icon name="MagnifyingGlassIcon" size={28} className="text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-slate-300 text-sm font-medium">Không tìm thấy kết quả</p>
                <p className="text-slate-500 text-xs mt-1">Thử tìm kiếm với từ khoá khác</p>
              </div>
            </div>
          ) : !query ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(148, 163, 184, 0.1)' }}
              >
                <Icon name="MagnifyingGlassIcon" size={28} className="text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-slate-300 text-sm font-medium">Tìm kiếm toàn hệ thống</p>
                <p className="text-slate-500 text-xs mt-1">Nhập từ khoá để tìm kiếm</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4 px-4">
                <span className="text-[11px] text-slate-500 px-2 py-1 bg-slate-800 rounded-lg">
                  Ví dụ: VJ 101, Nguyễn Văn An, VJ2B4K9
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {filteredResults.map((result, index) => {
                const typeConfig = getTypeColor(result.type);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      isSelected ? 'bg-slate-800/70' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeConfig.bg}`}
                    >
                      <Icon name={getTypeIcon(result.type)} size={16} className={typeConfig.text} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeConfig.bg} ${typeConfig.text}`}
                        >
                          {typeConfig.label}
                        </span>
                        {getStatusBadge(result.status)}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{result.subtitle}</p>
                    </div>
                    <Icon
                      name="ArrowRightIcon"
                      size={14}
                      className="text-slate-600 flex-shrink-0"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t text-xs text-slate-500"
          style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">↓</kbd>
              <span className="ml-1">Điều hướng</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">Enter</kbd>
              <span className="ml-1">Chọn</span>
            </span>
          </div>
          <span>{filteredResults.length} kết quả</span>
        </div>
      </div>
    </div>
  );
}
