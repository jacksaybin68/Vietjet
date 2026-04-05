import { NextRequest, NextResponse } from 'next/server';
import { sql, getOrCreateWallet, WalletTransactionRecord } from '@/lib/db';
import { verifyAuthRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const wallet = await getOrCreateWallet(user.id);
    return NextResponse.json({ success: true, wallet });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error, response } = await verifyAuthRequest(request);
    if (error || !user) return response!;

    const body = await request.json();
    const { action, amount, description, paymentMethodId } = body;

    const wallet = await getOrCreateWallet(user.id);

    if (action === 'topup') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Bad Request', message: 'Invalid amount' }, { status: 400 });
      }

      const balanceBefore = parseFloat(String(wallet.balance));
      const balanceAfter = balanceBefore + amount;

      // Start transaction
      const results = await sql.transaction([
        sql`
          INSERT INTO wallet_transactions (
            wallet_id, type, amount, balance_before, balance_after,
            description, payment_method_id, status
          )
          VALUES (
            ${wallet.id}, 'topup', ${amount}, ${balanceBefore}, ${balanceAfter},
            ${description || 'Nạp tiền vào ví'}, ${paymentMethodId || null}, 'completed'
          )
          RETURNING *
        `,
        sql`
          UPDATE user_wallets 
          SET balance = ${balanceAfter}, updated_at = NOW()
          WHERE id = ${wallet.id}
        `
      ]);

      return NextResponse.json({ 
        success: true, 
        wallet: { ...wallet, balance: balanceAfter },
        transaction: results[0][0] 
      });
    }

    return NextResponse.json({ error: 'Bad Request', message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Wallet API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
