import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AnnouncementBar from '@/shared/components/navigation/AnnouncementBar';

/** Minimal `Response` stand-in: `apiRequest` reads `.ok`/`.status`/`.text()`. */
function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const fetchMock = () => global.fetch as unknown as ReturnType<typeof vi.fn>;

describe('AnnouncementBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị nội dung mẫu khi chưa có thông báo nào được phát hành', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ announcements: [] }));
    render(<AnnouncementBar />);

    expect(screen.getByText(/Ưu đãi 50% cho vé khứ hồi nội địa/)).toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
  });

  it('hiển thị nội dung mẫu khi request lỗi', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ message: 'boom' }, false, 500));
    render(<AnnouncementBar />);

    expect(screen.getByText(/Ưu đãi 50% cho vé khứ hồi nội địa/)).toBeInTheDocument();
  });

  // `title` and `content` are separate columns and an operator fills both, so
  // the bar must not silently drop one of them.
  it('ghép tiêu đề và nội dung của thông báo đã phát hành', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse({
        announcements: [
          {
            id: 'a1',
            title: 'Bảo trì hệ thống',
            content: 'Hệ thống tạm ngưng từ 22h đến 23h ngày 20/10.',
            type: 'system',
          },
          { id: 'a2', title: 'Bảo trì hệ thống', content: 'Bảo trì hệ thống', type: 'system' },
        ],
      })
    );

    render(<AnnouncementBar />);

    await waitFor(() =>
      expect(
        screen.getByText('Bảo trì hệ thống — Hệ thống tạm ngưng từ 22h đến 23h ngày 20/10.')
      ).toBeInTheDocument()
    );
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('cho phép chuyển giữa các thông báo và đóng thanh bằng nút X', async () => {
    fetchMock().mockResolvedValue(jsonResponse({ announcements: [] }));
    render(<AnnouncementBar />);

    expect(screen.getByText('1/4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo tiếp theo' }));
    expect(screen.getByText('2/4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thông báo trước' }));
    expect(screen.getByText('1/4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByLabelText('Thông báo')).not.toBeInTheDocument();
  });
});
