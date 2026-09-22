import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getOrCreateConversation, getAllConversations, setConversationStatus } from '@/lib/db';

// ─── GET: Get conversations ─────────────────────────────────────────────────
// For users: Get their own conversation
// For admins: Get all conversations

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    // Admin can view all conversations
    if (isAdminRole(payload.role)) {
      const { conversations } = await getAllConversations();
      return NextResponse.json({ conversations });
    }

    // Regular user gets their own conversation
    const conversation = await getOrCreateConversation(
      payload.userId,
      payload.email,
      payload.fullName
    );

    return NextResponse.json({ conversations: [conversation] });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// ─── POST: Create or get conversation ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const payload = user;

    // Users can only create their own conversation
    const conversation = await getOrCreateConversation(
      payload.userId,
      payload.email,
      payload.fullName
    );

    return NextResponse.json(
      {
        success: true,
        conversation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Close or reopen a thread (admin triage) ──────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    // Archiving is an admin triage action; a user must not be able to close
    // their own thread to escape the support queue.
    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const conversationId = body?.conversation_id;
    const status = body?.status;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'conversation_id is required' },
        { status: 400 }
      );
    }
    if (status !== 'active' && status !== 'closed') {
      return NextResponse.json(
        { error: 'Bad Request', message: "status must be 'active' or 'closed'" },
        { status: 400 }
      );
    }

    const conversation = await setConversationStatus(conversationId, status);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error('Error updating conversation status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
