import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth';
import { getSavedPaymentMethods, deleteSavedPaymentMethod, setDefaultPaymentMethod } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken(request);
    if (!token?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteSavedPaymentMethod(id, token.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment method DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken(request);
    if (!token?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'set_default') {
      await setDefaultPaymentMethod(id, token.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Payment method PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}