import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getChatPresence, updateChatPresence, userOwnsConversation } from '@/lib/db';
import { isAdminRole } from '@/lib/rbac';

/**
 * Presence is conversation-scoped, so a caller may only touch a thread they
 * participate in. Admins participate in every thread; a regular user must own it.
 */
async function isParticipant(
  payload: { userId: string; role: string },
  conversationId: string
): Promise<boolean> {
  if (isAdminRole(payload.role)) return true;
  return userOwnsConversation(conversationId, payload.userId);
}

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;
    const payload = user;

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    if (!(await isParticipant(payload, conversationId))) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    // The viewer's own role decides which presence row is theirs; a `role` query
    // param must never let a caller read the other side's row.
    const role = isAdminRole(payload.role) ? 'admin' : 'user';
    const presence = await getChatPresence(conversationId, role);
    return NextResponse.json({ presence });
  } catch (error) {
    console.error('Error fetching chat presence:', error);
    return NextResponse.json({ error: 'Failed to fetch chat presence' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;
    const payload = user;

    const body = await request.json();
    const { conversationId, is_online, is_typing, last_seen } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    if (!(await isParticipant(payload, conversationId))) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You are not a participant in this conversation' },
        { status: 403 }
      );
    }

    const updates: {
      is_online?: boolean;
      is_typing?: boolean;
      last_seen?: string;
    } = {};
    if (is_online !== undefined) updates.is_online = is_online;
    if (is_typing !== undefined) updates.is_typing = is_typing;
    if (last_seen !== undefined) updates.last_seen = last_seen;

    await updateChatPresence(
      payload.userId,
      conversationId,
      isAdminRole(payload.role) ? 'admin' : 'user',
      updates
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat presence:', error);
    return NextResponse.json({ error: 'Failed to update chat presence' }, { status: 500 });
  }
}
