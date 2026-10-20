import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as guestChatPost } from '@/app/api/tro-chuyen/khach/route';
import { GET as chatGet, POST as chatPost } from '@/app/api/tro-chuyen/route';
import { GET as convsGet } from '@/app/api/tro-chuyen/cuoc-hoi-thoai/route';
import { generateTokens, type User } from '@/lib/auth';

describe('End-to-End Chat Flow: Guest User <-> Admin Connection & Logic', () => {
  it('handles full lifecycle: guest starts chat, sends message, admin lists conv & replies, guest reads reply', async () => {
    // 1. Khách điền Họ & Tên, Số điện thoại, Số CCCD và bấm Bắt đầu trò chuyện
    const guestReq = new NextRequest('http://localhost:4028/api/tro-chuyen/khach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Đặng Tuấn Anh',
        phone: '0977889900',
        idNumber: '001202888999',
      }),
    });

    const guestRes = await guestChatPost(guestReq);
    expect(guestRes.status).toBe(200);

    const guestData = await guestRes.json();
    expect(guestData.success).toBe(true);
    expect(guestData.conversationId).toBeDefined();
    expect(guestData.user.fullName).toBe('Đặng Tuấn Anh');
    expect(guestData.user.phone).toBe('0977889900');
    expect(guestData.user.idNumber).toBe('001202888999');

    const conversationId = guestData.conversationId;

    const guestToken = guestRes.cookies.get('access_token')?.value;
    expect(guestToken).toBeDefined();

    const csrfToken = 'test-valid-csrf-token-32-chars-long!';

    // 2. Khách gửi tin nhắn thắc mắc vào cuộc trò chuyện
    const guestMsgReq = new NextRequest('http://localhost:4028/api/tro-chuyen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${guestToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: 'Chào tổng đài, tôi muốn hỏi thủ tục bay kèm trẻ sơ sinh',
      }),
    });

    const guestMsgRes = await chatPost(guestMsgReq);
    expect(guestMsgRes.status).toBe(201);
    const guestMsgData = await guestMsgRes.json();
    expect(guestMsgData.success).toBe(true);
    expect(guestMsgData.message.sender_role).toBe('user');
    expect(guestMsgData.message.content).toBe(
      'Chào tổng đài, tôi muốn hỏi thủ tục bay kèm trẻ sơ sinh'
    );

    // 3. Admin đăng nhập và lấy danh sách hội thoại
    const adminUser: User = {
      id: 'admin-test-uuid',
      email: 'admin@vietjetair.vn',
      full_name: 'Quản trị viên Vietjet',
      role: 'admin',
      phone: '0900000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const adminTokens = generateTokens(adminUser);

    const adminConvsReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-hoi-thoai', {
      method: 'GET',
      headers: {
        cookie: `access_token=${adminTokens.accessToken}`,
      },
    });

    const adminConvsRes = await convsGet(adminConvsReq);
    expect(adminConvsRes.status).toBe(200);
    const adminConvsData = await adminConvsRes.json();
    expect(Array.isArray(adminConvsData.conversations)).toBe(true);

    // Kiểm tra cuộc trò chuyện của khách xuất hiện trong danh sách Admin
    const targetConv = adminConvsData.conversations.find(
      (c: { id: string }) => c.id === conversationId
    );
    expect(targetConv).toBeDefined();
    expect(targetConv.user_name).toContain('Đặng Tuấn Anh');
    expect(targetConv.user_name).toContain('0977889900');
    expect(targetConv.user_name).toContain('001202888999');

    // 4. Admin mở chi tiết cuộc trò chuyện để đọc tin nhắn
    const adminReadReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${conversationId}`,
      {
        method: 'GET',
        headers: {
          cookie: `access_token=${adminTokens.accessToken}`,
        },
      }
    );

    const adminReadRes = await chatGet(adminReadReq);
    expect(adminReadRes.status).toBe(200);
    const adminReadData = await adminReadRes.json();
    expect(adminReadData.messages.length).toBeGreaterThanOrEqual(2); // Tin mở đầu thông tin + tin thắc mắc của khách

    const clientMsg = adminReadData.messages.find(
      (m: { content: string }) =>
        m.content === 'Chào tổng đài, tôi muốn hỏi thủ tục bay kèm trẻ sơ sinh'
    );
    expect(clientMsg).toBeDefined();

    // 5. Admin gửi tin nhắn giải đáp cho khách
    const adminReplyReq = new NextRequest('http://localhost:4028/api/tro-chuyen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content:
          'Dạ chào anh Tuấn Anh! Em bé dưới 2 tuổi được miễn vé và cần mang theo giấy khai sinh bản gốc/trích lục ạ.',
      }),
    });

    const adminReplyRes = await chatPost(adminReplyReq);
    expect(adminReplyRes.status).toBe(201);
    const adminReplyData = await adminReplyRes.json();
    expect(adminReplyData.message.sender_role).toBe('admin');

    // 6. Khách hàng nhận được tin nhắn giải đáp từ Admin
    const guestCheckReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${conversationId}`,
      {
        method: 'GET',
        headers: {
          cookie: `access_token=${guestToken}`,
        },
      }
    );

    const guestCheckRes = await chatGet(guestCheckReq);
    expect(guestCheckRes.status).toBe(200);
    const guestCheckData = await guestCheckRes.json();
    const adminAnswer = guestCheckData.messages.find(
      (m: { sender_role: string; content: string }) =>
        m.sender_role === 'admin' && m.content.includes('mang theo giấy khai sinh')
    );
    expect(adminAnswer).toBeDefined();

    // 7. Bảo mật IDOR: Người dùng lạ không thể xem cuộc trò chuyện này
    const intruderUser: User = {
      id: 'intruder-uuid',
      email: 'intruder@gmail.com',
      full_name: 'Kẻ xâm nhập',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const intruderTokens = generateTokens(intruderUser);

    const intruderReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${conversationId}`,
      {
        method: 'GET',
        headers: {
          cookie: `access_token=${intruderTokens.accessToken}`,
        },
      }
    );

    const intruderRes = await chatGet(intruderReq);
    expect(intruderRes.status).toBe(403);
  });
});
