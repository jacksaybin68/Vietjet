import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRequest } from '@/lib/auth';
import { getChatPresence, updateChatPresence } from '@/lib/db';
import { isAdminRole } from '@/lib/rbac';

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

    const role = searchParams.get('role') as 'user' | 'admin' | null;
    const presence = await getChatPresence(
      conversationId,
      role || (payload.role as 'user' | 'admin')
    );
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

    const updates: any = {};
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
