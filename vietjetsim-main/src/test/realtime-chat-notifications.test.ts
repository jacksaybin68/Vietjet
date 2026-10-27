import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as guestChatPost } from '@/app/api/tro-chuyen/khach/route';
import { GET as chatGet, POST as chatPost } from '@/app/api/tro-chuyen/route';
import { GET as convsGet } from '@/app/api/tro-chuyen/cuoc-hoi-thoai/route';
import { POST as markReadPost } from '@/app/api/tro-chuyen/danh-dau-da-doc/route';
import { GET as presenceGet, POST as presencePost } from '@/app/api/tro-chuyen/truc-tuyen/route';
import { GET as callGet, POST as callPost } from '@/app/api/tro-chuyen/cuoc-goi/route';
import { generateTokens, type User } from '@/lib/auth';

describe('Real-time Chat Messages & Notifications Verification', () => {
  it('synchronizes real-time messages, unread notification counters, presence typing, and voice calling between User and Admin', async () => {
    const csrfToken = 'test-valid-csrf-token-32-chars-long!';

    // ─── 1. Guest starts chat session ─────────────────────────────────────────
    const guestReq = new NextRequest('http://localhost:4028/api/tro-chuyen/khach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Lê Hoàng Nam',
        phone: '0911223344',
        idNumber: '001099887766',
      }),
    });

    const guestRes = await guestChatPost(guestReq);
    expect(guestRes.status).toBe(200);
    const guestData = await guestRes.json();
    const convId = guestData.conversationId;
    const guestToken = guestRes.cookies.get('access_token')?.value || '';
    expect(guestToken).toBeDefined();

    // ─── 2. Setup Admin credentials ──────────────────────────────────────────
    const adminUser: User = {
      id: 'admin-rt-test-id',
      email: 'admin.support@vietjetair.vn',
      full_name: 'CSKH Vietjet Air',
      role: 'admin',
      phone: '0909999888',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const adminTokens = generateTokens(adminUser);

    // ─── 3. User sends a message in real-time ─────────────────────────────────
    const userMsgText = 'Em muốn hỏi về quy định mang hành lý xách tay 7kg';
    const sendMsgReq = new NextRequest('http://localhost:4028/api/tro-chuyen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${guestToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        conversation_id: convId,
        content: userMsgText,
      }),
    });

    const sendMsgRes = await chatPost(sendMsgReq);
    expect(sendMsgRes.status).toBe(201);
    const sendMsgData = await sendMsgRes.json();
    expect(sendMsgData.success).toBe(true);
    expect(sendMsgData.message.content).toBe(userMsgText);

    // ─── 4. Admin checks conversation list and verifies unread counter ────────
    const adminConvsReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-hoi-thoai', {
      method: 'GET',
      headers: { cookie: `access_token=${adminTokens.accessToken}` },
    });

    const adminConvsRes = await convsGet(adminConvsReq);
    expect(adminConvsRes.status).toBe(200);
    const adminConvsData = await adminConvsRes.json();
    const targetConv = adminConvsData.conversations.find((c: { id: string }) => c.id === convId);
    expect(targetConv).toBeDefined();
    expect(targetConv.last_message).toBe(userMsgText);
    expect(targetConv.unread_by_admin).toBeGreaterThanOrEqual(1);

    // ─── 5. Admin marks messages as read ──────────────────────────────────────
    const markAdminReadReq = new NextRequest(
      'http://localhost:4028/api/tro-chuyen/danh-dau-da-doc',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
          cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
        },
        body: JSON.stringify({ conversation_id: convId }),
      }
    );

    const markAdminReadRes = await markReadPost(markAdminReadReq);
    expect(markAdminReadRes.status).toBe(200);

    // ─── 6. Real-time Presence: Typing indicator ────────────────────────────
    const userTypingReq = new NextRequest('http://localhost:4028/api/tro-chuyen/truc-tuyen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${guestToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        conversationId: convId,
        is_online: true,
        is_typing: true,
      }),
    });

    const userTypingRes = await presencePost(userTypingReq);
    expect(userTypingRes.status).toBe(200);

    // User checks presence and confirms status is active & typing
    const userCheckPresenceReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen/truc-tuyen?conversationId=${convId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${guestToken}` },
      }
    );

    const userCheckPresenceRes = await presenceGet(userCheckPresenceReq);
    expect(userCheckPresenceRes.status).toBe(200);
    const presenceData = await userCheckPresenceRes.json();
    expect(presenceData.presence.is_typing).toBe(true);
    expect(presenceData.presence.is_online).toBe(true);

    // ─── 7. Admin sends reply in real-time ────────────────────────────────────
    const adminReplyText =
      'Dạ chào Quý khách! Hành lý xách tay tiêu chuẩn là 01 kiện chính tối đa 7kg (56x36x23cm) ạ.';
    const adminReplyReq = new NextRequest('http://localhost:4028/api/tro-chuyen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        conversation_id: convId,
        content: adminReplyText,
      }),
    });

    const adminReplyRes = await chatPost(adminReplyReq);
    expect(adminReplyRes.status).toBe(201);

    // ─── 8. User fetches messages and sees Admin reply in real time ───────────
    const userGetMsgsReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${convId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${guestToken}` },
      }
    );

    const userGetMsgsRes = await chatGet(userGetMsgsReq);
    expect(userGetMsgsRes.status).toBe(200);
    const userGetMsgsData = await userGetMsgsRes.json();
    const adminMsgInList = userGetMsgsData.messages.find(
      (m: { sender_role: string; content: string }) =>
        m.sender_role === 'admin' && m.content === adminReplyText
    );
    expect(adminMsgInList).toBeDefined();

    // ─── 9. Real-time Voice Calling flow ──────────────────────────────────────
    // User clicks Call Hotline
    const callInitReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${guestToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        action: 'initiate',
        conversation_id: convId,
        caller_name: 'Lê Hoàng Nam',
      }),
    });

    const callInitRes = await callPost(callInitReq);
    expect(callInitRes.status).toBe(201);
    const callData = await callInitRes.json();
    const callId = callData.call.id;
    expect(callData.call.status).toBe('ringing');

    // Admin receives incoming call alert in real-time
    const checkIncomingReq = new NextRequest(
      'http://localhost:4028/api/tro-chuyen/cuoc-goi?checkIncoming=true',
      {
        method: 'GET',
        headers: { cookie: `access_token=${adminTokens.accessToken}` },
      }
    );
    const checkIncomingRes = await callGet(checkIncomingReq);
    expect(checkIncomingRes.status).toBe(200);
    const incomingData = await checkIncomingRes.json();
    expect(incomingData.incomingCall.id).toBe(callId);

    // Admin answers call
    const acceptCallReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        action: 'accept',
        call_id: callId,
      }),
    });
    const acceptCallRes = await callPost(acceptCallReq);
    expect(acceptCallRes.status).toBe(200);
    const acceptedData = await acceptCallRes.json();
    expect(acceptedData.call.status).toBe('connected');

    // Admin ends call after 68 seconds
    const endCallReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        action: 'end',
        call_id: callId,
        duration_seconds: 68,
        conversation_id: convId,
      }),
    });
    const endCallRes = await callPost(endCallReq);
    expect(endCallRes.status).toBe(200);

    // Both parties see the system call log in the chat messages
    const verifyLogsReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${convId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${guestToken}` },
      }
    );
    const verifyLogsRes = await chatGet(verifyLogsReq);
    expect(verifyLogsRes.status).toBe(200);
    const verifyLogsData = await verifyLogsRes.json();
    const callSummary = verifyLogsData.messages.find(
      (m: { content: string }) => m.content.includes('📞') && m.content.includes('01:08')
    );
    expect(callSummary).toBeDefined();
  });
});
