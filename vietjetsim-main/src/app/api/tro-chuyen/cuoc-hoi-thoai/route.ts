import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { isAdminRole } from '@/lib/rbac';
import { getOrCreateConversation, getAllConversations } from '@/lib/db';

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
