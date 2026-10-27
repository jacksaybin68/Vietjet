import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import {
  createChatCall,
  getActiveChatCall,
  getLatestRingingCallForAdmin,
  updateChatCallStatus,
  sendChatMessage,
  userOwnsConversation,
} from '@/lib/db';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// ─── GET: Get active call or check incoming call ──────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const checkIncoming = searchParams.get('checkIncoming') === 'true';

    // Check incoming call for Admin (across all active chats)
    if (checkIncoming && isAdminRole(user.role)) {
      const incomingCall = await getLatestRingingCallForAdmin();
      return NextResponse.json({ incomingCall });
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'conversationId is required' },
        { status: 400 }
      );
    }

    if (!isAdminRole(user.role)) {
      const owns = await userOwnsConversation(conversationId, user.userId);
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden', message: 'Not allowed' }, { status: 403 });
      }
    }

    const activeCall = await getActiveChatCall(conversationId);
    return NextResponse.json({ call: activeCall });
  } catch (err) {
    console.error('Error fetching chat call:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch call' },
      { status: 500 }
    );
  }
}

// ─── POST: Initiate, Accept, Reject, End Call ────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const body = await request.json();
    const { action, conversation_id, call_id, duration_seconds, caller_name } = body;

    const isAdmin = isAdminRole(user.role);
    const callerRole = isAdmin ? 'admin' : 'user';

    if (action === 'initiate') {
      if (!conversation_id) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'conversation_id is required' },
          { status: 400 }
        );
      }

      if (!isAdmin) {
        const owns = await userOwnsConversation(conversation_id, user.userId);
        if (!owns) {
          return NextResponse.json({ error: 'Forbidden', message: 'Not allowed' }, { status: 403 });
        }
      }

      const call = await createChatCall({
        conversation_id,
        caller_id: user.userId,
        caller_role: callerRole,
        caller_name:
          caller_name || (isAdmin ? 'Tổng đài Vietjet Air' : user.fullName || 'Khách hàng'),
      });

      return NextResponse.json({ success: true, call }, { status: 201 });
    }

    if (!call_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'call_id is required' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      const call = await updateChatCallStatus(call_id, 'connected');
      return NextResponse.json({ success: true, call });
    }

    if (action === 'reject') {
      const call = await updateChatCallStatus(call_id, 'rejected');
      if (conversation_id) {
        const timeStr = new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        await sendChatMessage({
          conversation_id,
          sender_id: user.userId,
          sender_role: callerRole,
          content: `📞 Cuộc gọi nhỡ lúc ${timeStr}`,
        }).catch(() => {});
      }
      return NextResponse.json({ success: true, call });
    }

    if (action === 'end') {
      const duration = typeof duration_seconds === 'number' ? duration_seconds : 0;
      const call = await updateChatCallStatus(call_id, 'ended', duration);
      if (conversation_id) {
        const durationText = formatDuration(duration);
        await sendChatMessage({
          conversation_id,
          sender_id: user.userId,
          sender_role: callerRole,
          content:
            duration > 0
              ? `📞 Cuộc gọi thoại đã kết thúc. Thời lượng: ${durationText}`
              : `📞 Cuộc gọi thoại đã kết thúc`,
        }).catch(() => {});
      }
      return NextResponse.json({ success: true, call });
    }

    return NextResponse.json(
      { error: 'Bad Request', message: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error('Error handling voice call:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to process voice call' },
      { status: 500 }
    );
  }
}
