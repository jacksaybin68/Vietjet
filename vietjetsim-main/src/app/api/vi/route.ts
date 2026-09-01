import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateWallet,
  getSavedPaymentMethods,
  getWalletTransactions,
  topupWallet,
  withdrawWallet,
} from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const wallet = await getOrCreateWallet(user.userId);
    const methods = await getSavedPaymentMethods(user.userId);
    const { transactions } = await getWalletTransactions(user.userId, { page: 1, limit: 10 });

    return NextResponse.json({
      success: true,
      wallet,
      linkedBankAccounts: methods.filter((method) => method.type === 'bank'),
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const body = await request.json();
    const { action, amount, description, paymentMethodId } = body;
    const numericAmount = Number(amount);

    if (action === 'topup') {
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid amount' },
          { status: 400 }
        );
      }
      if (!paymentMethodId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing payment method' },
          { status: 400 }
        );
      }
      const methods = await getSavedPaymentMethods(user.userId);
      const linkedMethod = methods.find((method) => method.id === paymentMethodId);
      if (!linkedMethod) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Payment method not found' },
          { status: 400 }
        );
      }
      const transaction = await topupWallet(
        user.userId,
        numericAmount,
        paymentMethodId,
        description || 'Nạp tiền vào ví Vietjet Air'
      );
      const wallet = await getOrCreateWallet(user.userId);

      return NextResponse.json({
        success: true,
        wallet,
        transaction,
      });
    }

    if (action === 'withdraw') {
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid amount' },
          { status: 400 }
        );
      }
      if (!paymentMethodId) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Missing linked bank account' },
          { status: 400 }
        );
      }
      const methods = await getSavedPaymentMethods(user.userId);
      const linkedBank = methods.find((method) => method.id === paymentMethodId && method.type === 'bank');
      if (!linkedBank) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Linked bank account not found' },
          { status: 400 }
        );
      }

      const transaction = await withdrawWallet(
        user.userId,
        numericAmount,
        paymentMethodId,
        description || `Rút tiền về ${linkedBank.bank_name} - ${linkedBank.bank_id}`
      );
      const wallet = await getOrCreateWallet(user.userId);

      return NextResponse.json({
        success: true,
        wallet,
        transaction,
      });
    }

    return NextResponse.json({ error: 'Bad Request', message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Wallet API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
