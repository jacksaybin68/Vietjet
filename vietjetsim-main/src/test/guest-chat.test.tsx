import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authState, pathnameRef, services } = vi.hoisted(() => ({
  authState: {
    user: null as null | { id: string; fullName?: string; email?: string },
    isAdmin: false,
  },
  pathnameRef: { current: '/trang-chu' },
  services: {
    listConversations: vi.fn(),
    getConversationMessages: vi.fn(),
    sendChatMessage: vi.fn(),
    getChatPresence: vi.fn(),
    updateChatPresence: vi.fn(),
    markConversationRead: vi.fn(),
    initiateChatCall: vi.fn().mockResolvedValue({ success: true, call: null }),
    getActiveChatCall: vi.fn().mockResolvedValue({ call: null }),
    getIncomingAdminCall: vi.fn().mockResolvedValue({ incomingCall: null }),
    acceptChatCall: vi.fn().mockResolvedValue({ success: true, call: null }),
    rejectChatCall: vi.fn().mockResolvedValue({ success: true, call: null }),
    endChatCall: vi.fn().mockResolvedValue({ success: true, call: null }),
  },
}));

vi.mock('@/contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/AuthContext')>()),
  useAuth: () => authState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

vi.mock('@/features/chat/services', () => services);

import UserChat from '@/features/chat/components/UserChat';

describe('UserChat guest information collection and connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameRef.current = '/trang-chu';
    authState.user = null;
    services.listConversations.mockResolvedValue({ conversations: [] });
    services.getConversationMessages.mockResolvedValue({ messages: [] });
    services.sendChatMessage.mockResolvedValue({ success: true, message: {} });
    services.getChatPresence.mockResolvedValue({ presence: null });
    services.updateChatPresence.mockResolvedValue({ success: true });
    services.markConversationRead.mockResolvedValue({ success: true });
  });

  it('renders guest info form with Họ & Tên, Số điện thoại, Số CCCD and starts chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        conversationId: 'conv-guest-1',
        user: {
          id: 'guest-1',
          fullName: 'Trần Thị B',
          phone: '0987654321',
          idNumber: '001201999888',
        },
      }),
    });
    global.fetch = fetchMock;

    render(<UserChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở chat hỗ trợ' }));

    // Verify form fields
    expect(screen.getByText(/Họ & Tên :/)).toBeInTheDocument();
    expect(screen.getByText(/Số điện thoại :/)).toBeInTheDocument();
    expect(screen.getByText(/Số CCCD :/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' })).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), {
      target: { value: 'Trần Thị B' },
    });
    fireEvent.change(screen.getByPlaceholderText('0912345678'), {
      target: { value: '0987654321' },
    });
    fireEvent.change(screen.getByPlaceholderText('001201012345'), {
      target: { value: '001201999888' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/tro-chuyen/khach',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            fullName: 'Trần Thị B',
            phone: '0987654321',
            idNumber: '001201999888',
          }),
        })
      );
    });

    // After chat starts, input bar appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nhập tin nhắn...')).toBeInTheDocument();
    });

    // Guest sends a follow-up message
    const input = screen.getByPlaceholderText('Nhập tin nhắn...');
    fireEvent.change(input, { target: { value: 'Tôi muốn kiểm tra tình trạng chuyến bay' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => {
      expect(services.sendChatMessage).toHaveBeenCalledWith(
        'conv-guest-1',
        'Tôi muốn kiểm tra tình trạng chuyến bay'
      );
    });
  });

  it('validates required fields and phone number format before submitting', async () => {
    render(<UserChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở chat hỗ trợ' }));

    // Empty submission -> requires name
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));
    expect(screen.getByText('Vui lòng nhập Họ & Tên')).toBeInTheDocument();

    // Fill name but invalid phone
    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), {
      target: { value: 'Lê Văn C' },
    });
    fireEvent.change(screen.getByPlaceholderText('0912345678'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));
    expect(
      screen.getByText('Vui lòng nhập Số điện thoại hợp lệ (9-11 chữ số)')
    ).toBeInTheDocument();

    // Fill valid phone but missing CCCD
    fireEvent.change(screen.getByPlaceholderText('0912345678'), {
      target: { value: '0901234567' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));
    expect(screen.getByText('Vui lòng nhập Số CCCD')).toBeInTheDocument();
  });
});
