import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getConversationMessages, sendChatMessage, userOwnsConversation } from '@/lib/db';

// ─── GET: Get messages for a conversation ────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'conversationId is required' },
        { status: 400 }
      );
    }

    // ─── H6: Ownership check (IDOR prevention) ─────────────────────────
    // Regular users can only access their own conversations; admins can access all.
    if (!isAdminRole(payload.role)) {
      const ownsConversation = await userOwnsConversation(conversationId, payload.userId);
      if (!ownsConversation) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You are not a participant in this conversation' },
          { status: 403 }
        );
      }
    }

    const messages = await getConversationMessages(conversationId, { limit });

    return NextResponse.json({
      messages,
      conversationId,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// ─── POST: Send a chat message ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    const body = await request.json();
    const { conversation_id, content } = body;

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'conversation_id and content are required' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Content cannot be empty' },
        { status: 400 }
      );
    }

    // Verify conversation ownership
    if (!isAdminRole(payload.role)) {
      const ownsConversation = await userOwnsConversation(conversation_id, payload.userId);
      if (!ownsConversation) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You are not a participant in this conversation' },
          { status: 403 }
        );
      }
    }

    const message = await sendChatMessage({
      conversation_id,
      sender_id: payload.userId,
      sender_role: isAdminRole(payload.role) ? 'admin' : 'user',
      content: content.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message: {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          sender_role: message.sender_role,
          content: message.content,
          created_at: message.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to send message' },
      { status: 500 }
    );
  }
}
