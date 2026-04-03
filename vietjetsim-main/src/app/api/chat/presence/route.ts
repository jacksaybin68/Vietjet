import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { getChatPresence, updateChatPresence } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    const role = searchParams.get('role') as 'user' | 'admin' | null;
    const presence = await getChatPresence(conversationId, role || payload.role as 'user' | 'admin');
    return NextResponse.json({ presence });
  } catch (error) {
    console.error('Error fetching chat presence:', error);
    return NextResponse.json({ error: 'Failed to fetch chat presence' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, is_online, is_typing, last_seen } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    const updates: any = {};
    if (is_online !== undefined) updates.is_online = is_online;
    if (is_typing !== undefined) updates.is_typing = is_typing;
    if (last_seen !== undefined) updates.last_seen = last_seen;

    await updateChatPresence(payload.userId, conversationId, payload.role, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat presence:', error);
    return NextResponse.json({ error: 'Failed to update chat presence' }, { status: 500 });
  }
}
