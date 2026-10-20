import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  createUser,
  findUserByEmail,
  getOrCreateConversation,
  sendChatMessage,
  sql,
  type UserRecord,
} from '@/lib/db';
import { generateTokens, hashPassword, setAuthCookiesOnResponse, type User } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '')
      .replace(/[^0-9]/g, '')
      .trim();
    const idNumber = String(body.idNumber || '').trim();

    if (!fullName || !phone || !idNumber) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Vui lòng nhập đầy đủ Họ & Tên, Số điện thoại và Số CCCD',
        },
        { status: 400 }
      );
    }

    if (phone.length < 9 || phone.length > 11) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Số điện thoại không hợp lệ (cần 9-11 chữ số)',
        },
        { status: 400 }
      );
    }

    const guestEmail = `${phone}@khach.vietjetsim.vn`;
    let userRecord = await findUserByEmail(guestEmail);

    if (!userRecord) {
      // Tìm xem có user nào cùng số điện thoại không
      const byPhone = await sql`SELECT * FROM user_profiles WHERE phone = ${phone} LIMIT 1`;
      const foundByPhone = (byPhone as unknown as UserRecord[])[0];
      if (foundByPhone) {
        userRecord = foundByPhone;
      }
    }

    if (!userRecord) {
      const passwordHash = await hashPassword(randomUUID());
      userRecord = await createUser(
        guestEmail,
        passwordHash,
        `${fullName} (CCCD: ${idNumber})`,
        'user',
        phone
      );
    }

    const authUser: User = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: userRecord.full_name,
      role: 'user',
      phone: userRecord.phone || phone,
      avatar_url: userRecord.avatar_url || undefined,
      created_at: String(userRecord.created_at || new Date().toISOString()),
      updated_at: String(userRecord.updated_at || new Date().toISOString()),
    };

    const tokens = generateTokens(authUser);

    // Tạo hoặc lấy conversation
    const conversation = await getOrCreateConversation(
      authUser.id,
      authUser.email,
      `${fullName} - ${phone} - CCCD: ${idNumber}`
    );

    // Gửi tin nhắn mở đầu chứa thông tin khách hàng vào hội thoại
    const infoContent = `📋 Khách hàng bắt đầu trò chuyện:\n- Họ & Tên : ${fullName}\n- Số điện thoại : ${phone}\n- Số CCCD : ${idNumber}`;
    await sendChatMessage({
      conversation_id: conversation.id,
      sender_id: authUser.id,
      sender_role: 'user',
      content: infoContent,
    });

    const response = NextResponse.json(
      {
        success: true,
        conversationId: conversation.id,
        user: {
          id: authUser.id,
          fullName,
          phone,
          idNumber,
          email: authUser.email,
        },
      },
      { status: 200 }
    );

    // Lưu auth cookie để các request sau tự động có session
    setAuthCookiesOnResponse(response, tokens);

    return response;
  } catch (error) {
    console.error('Error starting guest chat:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Không thể khởi tạo phiên trò chuyện',
      },
      { status: 500 }
    );
  }
}
