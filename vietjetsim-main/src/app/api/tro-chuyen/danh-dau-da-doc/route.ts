import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { markConversationRead, userOwnsConversation } from '@/lib/db';

// ─── POST: Mark the other party's messages in a conversation as read ─────────

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const body = await request.json();
    const conversationId = body?.conversation_id;

    if (!conversationId || typeof conversationId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'conversation_id is required' },
        { status: 400 }
      );
    }

    const readerRole = isAdminRole(user.role) ? 'admin' : 'user';

    // Regular users may only touch their own conversation (IDOR prevention).
    if (readerRole === 'user') {
      const owns = await userOwnsConversation(conversationId, user.userId);
      if (!owns) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You are not a participant in this conversation' },
          { status: 403 }
        );
      }
    }

    const marked = await markConversationRead(conversationId, readerRole);

    return NextResponse.json({ success: true, marked });
  } catch (error) {
    console.error('Error marking conversation read:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to mark conversation read' },
      { status: 500 }
    );
  }
}
