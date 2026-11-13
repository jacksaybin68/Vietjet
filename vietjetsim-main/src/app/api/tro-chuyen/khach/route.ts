import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createUser, findUserByEmail, getOrCreateConversation, sendChatMessage } from '@/lib/db';
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

    // Không được "nhận diện" một tài khoản đã đăng ký chỉ bằng cách biết số
    // điện thoại. Trước đây route này tra `user_profiles.phone` và nếu trùng
    // thì tái sử dụng chính record đó — kèm `generateTokens()` để set cookie
    // phiên. Bất kỳ ai biết số điện thoại của một người đã đăng ký đều từ đó
    // đi vào được tài khoản của họ (đặt vé, xem ví, đọc PII), và tên hiển thị
    // trong profile còn bị ghi đè bằng tên khách gõ vào.
    //
    // Hành vi đúng: khách chat luôn thuộc về một tài khoản khách *riêng*, tách
    // biệt khỏi tài khoản đăng ký (kể cả khi trùng số điện thoại). Tài khoản
    // đăng ký chỉ được liên kết khi khách tự đăng nhập.
    const cleanName = fullName.replace(/\s*\(CCCD:.*?\)/gi, '').trim();

    if (!userRecord) {
      const passwordHash = await hashPassword(randomUUID());
      // `phone` is intentionally NOT stored: `user_profiles_phone_key` is
      // UNIQUE (migration 007), so a guest account that claimed a registered
      // customer's number would collide with that customer's row. The guest
      // account is identified by its synthetic `phone@khach.vietjetsim.vn`
      // email instead.
      userRecord = await createUser(guestEmail, passwordHash, cleanName, 'user', null);
    }

    const authUser: User = {
      id: userRecord.id,
      email: userRecord.email,
      full_name: cleanName || userRecord.full_name,
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
      `${cleanName} - ${phone} - CCCD: ${idNumber}`
    );

    // Gửi tin nhắn mở đầu chứa thông tin khách hàng vào hội thoại
    const infoContent = `📋 Khách hàng bắt đầu trò chuyện:\n- Họ & Tên : ${cleanName}\n- Số điện thoại : ${phone}\n- Số CCCD : ${idNumber}`;
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
          fullName: cleanName,
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
