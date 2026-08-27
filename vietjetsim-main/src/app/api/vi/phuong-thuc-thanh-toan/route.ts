import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth';
import { getSavedPaymentMethods, addSavedPaymentMethod } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken(request);
    if (!token?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const methods = await getSavedPaymentMethods(token.userId);

    return NextResponse.json({
      methods: methods.map((m) => ({
        id: m.id,
        type: m.type,
        card_brand: m.card_brand,
        last_four: m.last_four,
        card_holder_name: m.card_holder_name,
        expiry_month: m.expiry_month,
        expiry_year: m.expiry_year,
        bank_id: m.bank_id,
        bank_name: m.bank_name,
        bank_code: m.bank_code,
        is_default: m.is_default,
        created_at: m.created_at,
      })),
    });
  } catch (error) {
    console.error('Payment methods GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken(request);
    if (!token?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      card_brand,
      last_four,
      card_holder_name,
      expiry_month,
      expiry_year,
      bank_id,
      bank_name,
      bank_code,
    } = body;

    if (!type || !['card', 'bank'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payment method type' }, { status: 400 });
    }

    if (type === 'card') {
      if (!card_brand || !last_four || !card_holder_name || !expiry_month || !expiry_year) {
        return NextResponse.json({ error: 'Missing card information' }, { status: 400 });
      }
    } else {
      if (!bank_id || !bank_name) {
        return NextResponse.json({ error: 'Missing bank information' }, { status: 400 });
      }
    }

    const method = await addSavedPaymentMethod({
      user_id: token.userId,
      type,
      card_brand,
      last_four,
      card_holder_name,
      expiry_month: expiry_month ? parseInt(expiry_month) : undefined,
      expiry_year: expiry_year ? parseInt(expiry_year) : undefined,
      bank_id,
      bank_name,
      bank_code,
    });

    return NextResponse.json({
      success: true,
      method: {
        id: method.id,
        type: method.type,
        card_brand: method.card_brand,
        last_four: method.last_four,
        card_holder_name: method.card_holder_name,
        bank_id: method.bank_id,
        bank_name: method.bank_name,
        is_default: method.is_default,
        created_at: method.created_at,
      },
    });
  } catch (error) {
    console.error('Payment methods POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
