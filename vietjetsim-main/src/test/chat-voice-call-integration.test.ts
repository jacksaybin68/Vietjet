import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as guestChatPost } from '@/app/api/tro-chuyen/khach/route';
import { GET as callGet, POST as callPost } from '@/app/api/tro-chuyen/cuoc-goi/route';
import { GET as chatGet } from '@/app/api/tro-chuyen/route';
import { generateTokens, type User } from '@/lib/auth';

describe('Voice Call & Real-time Calling Integration: User <-> Admin', () => {
  it('handles full lifecycle: initiate call, incoming detection, accept, live connection, and end call with message summary', async () => {
    // 1. Guest creates a support chat conversation
    const guestReq = new NextRequest('http://localhost:4028/api/tro-chuyen/khach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Nguyễn Văn Minh',
        phone: '0912345678',
        idNumber: '079202000111',
      }),
    });

    const guestRes = await guestChatPost(guestReq);
    expect(guestRes.status).toBe(200);
    const guestData = await guestRes.json();
    const conversationId = guestData.conversationId;
    const guestToken = guestRes.cookies.get('access_token')?.value;
    expect(guestToken).toBeDefined();

    const csrfToken = 'test-valid-csrf-token-32-chars-long!';

    // 2. User initiates a voice call to Admin
    const callInitReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${guestToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        action: 'initiate',
        conversation_id: conversationId,
        caller_name: 'Nguyễn Văn Minh',
      }),
    });

    const callInitRes = await callPost(callInitReq);
    expect(callInitRes.status).toBe(201);
    const callInitData = await callInitRes.json();
    expect(callInitData.success).toBe(true);
    expect(callInitData.call.status).toBe('ringing');
    expect(callInitData.call.caller_role).toBe('user');
    expect(callInitData.call.conversation_id).toBe(conversationId);
    const callId = callInitData.call.id;

    // 3. Admin receives the incoming call notification
    const adminUser: User = {
      id: 'admin-call-test-id',
      email: 'admin@vietjetair.vn',
      full_name: 'Tổng đài viên Vietjet',
      role: 'admin',
      phone: '0901234567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const adminTokens = generateTokens(adminUser);

    const checkIncomingReq = new NextRequest(
      'http://localhost:4028/api/tro-chuyen/cuoc-goi?checkIncoming=true',
      {
        method: 'GET',
        headers: { cookie: `access_token=${adminTokens.accessToken}` },
      }
    );

    const checkIncomingRes = await callGet(checkIncomingReq);
    expect(checkIncomingRes.status).toBe(200);
    const checkIncomingData = await checkIncomingRes.json();
    expect(checkIncomingData.incomingCall).toBeDefined();
    expect(checkIncomingData.incomingCall.id).toBe(callId);
    expect(checkIncomingData.incomingCall.caller_name).toBe('Nguyễn Văn Minh');

    // 4. Admin accepts the call
    const acceptReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
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

    const acceptRes = await callPost(acceptReq);
    expect(acceptRes.status).toBe(200);
    const acceptData = await acceptRes.json();
    expect(acceptData.success).toBe(true);
    expect(acceptData.call.status).toBe('connected');

    // 5. User polls and sees call connected
    const userPollReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen/cuoc-goi?conversationId=${conversationId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${guestToken}` },
      }
    );
    const userPollRes = await callGet(userPollReq);
    expect(userPollRes.status).toBe(200);
    const userPollData = await userPollRes.json();
    expect(userPollData.call.status).toBe('connected');

    // 6. Call ends after 125 seconds
    const endReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        action: 'end',
        call_id: callId,
        duration_seconds: 125,
        conversation_id: conversationId,
      }),
    });

    const endRes = await callPost(endReq);
    expect(endRes.status).toBe(200);
    const endData = await endRes.json();
    expect(endData.call.status).toBe('ended');
    expect(endData.call.duration_seconds).toBe(125);

    // 7. Verify a call summary system message was created in the conversation
    const messagesReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${conversationId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${guestToken}` },
      }
    );
    const messagesRes = await chatGet(messagesReq);
    expect(messagesRes.status).toBe(200);
    const messagesData = await messagesRes.json();
    const callLogMessage = messagesData.messages.find(
      (m: { content: string }) => m.content.includes('📞') && m.content.includes('02:05')
    );
    expect(callLogMessage).toBeDefined();

    // 8. IDOR Prevention: Unauthorized user cannot view call of another conversation
    const intruderUser: User = {
      id: 'intruder-id-999',
      email: 'intruder@test.com',
      full_name: 'Intruder',
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const intruderTokens = generateTokens(intruderUser);
    const intruderReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen/cuoc-goi?conversationId=${conversationId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${intruderTokens.accessToken}` },
      }
    );
    const intruderRes = await callGet(intruderReq);
    expect(intruderRes.status).toBe(403);
  });

  it('handles rejected/missed call flow with proper system notification message', async () => {
    const csrfToken = 'test-valid-csrf-token-32-chars-long!';

    // 1. Guest creates conversation
    const guestReq = new NextRequest('http://localhost:4028/api/tro-chuyen/khach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Trần Thị Mai',
        phone: '0988776655',
        idNumber: '001200333444',
      }),
    });
    const guestRes = await guestChatPost(guestReq);
    const guestData = await guestRes.json();
    const convId = guestData.conversationId;
    const guestToken = guestRes.cookies.get('access_token')?.value;

    // 2. User initiates call
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
        caller_name: 'Trần Thị Mai',
      }),
    });
    const callInitRes = await callPost(callInitReq);
    const callInitData = await callInitRes.json();
    const callId = callInitData.call.id;

    // 3. Admin rejects call
    const adminUser: User = {
      id: 'admin-call-test-id-2',
      email: 'admin2@vietjetair.vn',
      full_name: 'Admin 2',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const adminTokens = generateTokens(adminUser);

    const rejectReq = new NextRequest('http://localhost:4028/api/tro-chuyen/cuoc-goi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        cookie: `access_token=${adminTokens.accessToken}; csrf_token=${csrfToken}`,
      },
      body: JSON.stringify({
        action: 'reject',
        call_id: callId,
        conversation_id: convId,
      }),
    });
    const rejectRes = await callPost(rejectReq);
    expect(rejectRes.status).toBe(200);
    const rejectData = await rejectRes.json();
    expect(rejectData.call.status).toBe('rejected');

    // 4. Verify missed call message
    const messagesReq = new NextRequest(
      `http://localhost:4028/api/tro-chuyen?conversationId=${convId}`,
      {
        method: 'GET',
        headers: { cookie: `access_token=${guestToken}` },
      }
    );
    const messagesRes = await chatGet(messagesReq);
    const messagesData = await messagesRes.json();
    const missedMsg = messagesData.messages.find((m: { content: string }) =>
      m.content.includes('nhỡ')
    );
    expect(missedMsg).toBeDefined();
  });
});
