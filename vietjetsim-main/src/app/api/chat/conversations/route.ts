import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getOrCreateConversation, getAllConversations } from '@/lib/db';

// ─── GET: Get conversations ─────────────────────────────────────────────────
// For users: Get their own conversation
// For admins: Get all conversations

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token found' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Admin can view all conversations
    if (payload.role === 'admin') {
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
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No access token found' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

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
