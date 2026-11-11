import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { lookupBankBin } from '@/lib/vietqr';

export async function GET(_request: NextRequest) {
  try {
    const rawAccounts = await sql`
      SELECT id, bank_name as admin_bank_name, account_number as admin_bank_account_number, 
             account_holder as admin_bank_account_holder, bank_bin, branch, logo_url, is_default,
             transfer_note_template
      FROM bank_accounts
      WHERE is_active = true
      ORDER BY is_default DESC, created_at DESC
    `;

    const accounts = (rawAccounts || []).map((acc: any) => ({
      ...acc,
      bank_bin: lookupBankBin(acc.admin_bank_name, acc.bank_bin),
    }));

    return NextResponse.json({
      bankConfig: accounts[0] || {}, // For backward compatibility
      accounts: accounts,
    });
  } catch (error) {
    console.error('Error fetching bank config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
