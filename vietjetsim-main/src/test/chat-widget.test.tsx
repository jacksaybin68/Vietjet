import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────
// `vi.hoisted` keeps these handles alive while the hoisted mock factories run.

const { authState, pathnameRef, services } = vi.hoisted(() => ({
  authState: {
    user: null as null | { id: string; fullName?: string; email?: string },
    isAdmin: false,
  },
  pathnameRef: { current: '/' },
  services: {
    listConversations: vi.fn(),
    getConversationMessages: vi.fn(),
    sendChatMessage: vi.fn(),
    getChatPresence: vi.fn(),
    updateChatPresence: vi.fn(),
    markConversationRead: vi.fn(),
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

const signedIn = () => {
  authState.user = { id: 'user-1', fullName: 'Nguyễn Văn A', email: 'a@example.com' };
};

describe('UserChat — Vietjet-style launcher', () => {
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

  it('uses the local Vietjet Air logo for the chat launcher', () => {
    render(<UserChat />);
    const launcher = screen.getByRole('button', { name: 'Mở chat hỗ trợ' });
    const logo = within(launcher).getByRole('img', { name: 'Logo hỗ trợ Vietjet Air' });

    expect(logo).toHaveAttribute('src', '/assets/images/app_logo.svg');
    expect(screen.getByText('Xin chào!')).toBeInTheDocument();
  });

  // Guests see the same launcher vietjetair.com shows, but the panel must not
  // pretend there is a thread behind it — it asks them to sign in.
  it('asks signed-out visitors to sign in instead of opening an empty thread', () => {
    render(<UserChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở chat hỗ trợ' }));

    expect(screen.getByText('Tổng đài Vietjet Air')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập để trò chuyện' })).toHaveAttribute(
      'href',
      '/dang-nhap?redirect=/trang-chu'
    );
    expect(screen.queryByPlaceholderText('Nhập tin nhắn...')).toBeNull();
  });

  it('greets signed-in users with quick replies that send their own label', async () => {
    signedIn();
    services.listConversations.mockResolvedValue({
      conversations: [{ id: 'conv-1', user_id: 'user-1', unread_by_user: 0 }],
    });

    render(<UserChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Mở chat hỗ trợ' }));

    const chip = await screen.findByText('Quy định hành lý');
    expect(screen.getByPlaceholderText('Nhập tin nhắn...')).toBeInTheDocument();

    fireEvent.click(chip);
    await waitFor(() =>
      expect(services.sendChatMessage).toHaveBeenCalledWith('conv-1', 'Quy định hành lý')
    );
  });

  // The admin console mounts its own chat surface; the user widget stays out.
  it('renders nothing on the admin console', () => {
    pathnameRef.current = '/quan-tri';
    const { container } = render(<UserChat />);
    expect(container).toBeEmptyDOMElement();
  });
});
