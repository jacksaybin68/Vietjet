import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET(request: NextRequest) {
  try {
    const accounts = await sql`
      SELECT id, bank_name as admin_bank_name, account_number as admin_bank_account_number, 
             account_holder as admin_bank_account_holder, bank_bin, branch, logo_url, is_default,
             transfer_note_template
      FROM bank_accounts
      WHERE is_active = true
      ORDER BY is_default DESC, created_at DESC
    `;

    return NextResponse.json({ 
      bankConfig: accounts[0] || {}, // For backward compatibility
      accounts: accounts 
    });
  } catch (error) {
    console.error('Error fetching bank config:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
