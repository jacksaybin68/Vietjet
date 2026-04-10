import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: List all bank accounts ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'system:config' as any);
    if (error) return response;

    const accounts = await sql`
      SELECT * FROM bank_accounts 
      ORDER BY is_default DESC, created_at DESC
    `;

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST: Create a new bank account ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'system:config' as any);
    if (error) return response;

    const body = await request.json();
    const { bank_name, account_number, account_holder, bank_bin, branch, is_default, transfer_note_template } = body;

    if (!bank_name || !account_number || !account_holder) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If setting as default, unset others first
    if (is_default) {
      await sql`UPDATE bank_accounts SET is_default = false WHERE is_default = true`;
    }

    const [account] = await sql`
      INSERT INTO bank_accounts (bank_name, account_number, account_holder, bank_bin, branch, is_default, transfer_note_template)
      VALUES (${bank_name}, ${account_number}, ${account_holder}, ${bank_bin || null}, ${branch || null}, ${is_default || false}, ${transfer_note_template || 'VJ {code}'})
      RETURNING *
    `;

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
