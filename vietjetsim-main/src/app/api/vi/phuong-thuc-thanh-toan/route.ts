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
      cardBrand,
      last_four,
      lastFour,
      card_holder_name,
      cardHolderName,
      expiry_month,
      expiryMonth,
      expiry_year,
      expiryYear,
      bank_id,
      bankId,
      bank_name,
      bankName,
      bank_code,
      bankCode,
    } = body;
    const normalized = {
      card_brand: card_brand ?? cardBrand,
      last_four: last_four ?? lastFour,
      card_holder_name: card_holder_name ?? cardHolderName,
      expiry_month: expiry_month ?? expiryMonth,
      expiry_year: expiry_year ?? expiryYear,
      bank_id: bank_id ?? bankId,
      bank_name: bank_name ?? bankName,
      bank_code: bank_code ?? bankCode,
    };

    if (!type || !['card', 'bank'].includes(type)) {
      return NextResponse.json({ error: 'Invalid payment method type' }, { status: 400 });
    }

    if (type === 'card') {
      if (
        !normalized.card_brand ||
        !normalized.last_four ||
        !normalized.card_holder_name ||
        !normalized.expiry_month ||
        !normalized.expiry_year
      ) {
        return NextResponse.json({ error: 'Missing card information' }, { status: 400 });
      }
    } else {
      if (!normalized.bank_id || !normalized.bank_name) {
        return NextResponse.json({ error: 'Missing bank information' }, { status: 400 });
      }
    }

    const method = await addSavedPaymentMethod({
      user_id: token.userId,
      type,
      card_brand: normalized.card_brand,
      last_four: normalized.last_four,
      card_holder_name: normalized.card_holder_name,
      expiry_month: normalized.expiry_month ? parseInt(String(normalized.expiry_month), 10) : undefined,
      expiry_year: normalized.expiry_year ? parseInt(String(normalized.expiry_year), 10) : undefined,
      bank_id: normalized.bank_id,
      bank_name: normalized.bank_name,
      bank_code: normalized.bank_code,
    });

    const responseMethod = {
      id: method.id,
      type: method.type,
      card_brand: method.card_brand,
      last_four: method.last_four,
      card_holder_name: method.card_holder_name,
      expiry_month: method.expiry_month,
      expiry_year: method.expiry_year,
      bank_id: method.bank_id,
      bank_name: method.bank_name,
      bank_code: method.bank_code,
      is_default: method.is_default,
      is_active: method.is_active,
      created_at: method.created_at,
    };

    return NextResponse.json({
      success: true,
      method: responseMethod,
      paymentMethod: responseMethod,
    });
  } catch (error) {
    console.error('Payment methods POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
