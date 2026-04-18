import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── PATCH: Update a bank account ───────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, response } = await verifyAdminRequest(request, 'system:config' as any);
    if (error) return response;

    const body = await request.json();
    const {
      bank_name,
      account_number,
      account_holder,
      bank_bin,
      branch,
      is_default,
      is_active,
      transfer_note_template,
    } = body;

    // If setting as default, unset others first
    if (is_default) {
      await sql`UPDATE bank_accounts SET is_default = false WHERE is_default = true`;
    }

    const [account] = await sql`
      UPDATE bank_accounts
      SET 
        bank_name = COALESCE(${bank_name}, bank_name),
        account_number = COALESCE(${account_number}, account_number),
        account_holder = COALESCE(${account_holder}, account_holder),
        bank_bin = COALESCE(${bank_bin}, bank_bin),
        branch = COALESCE(${branch}, branch),
        is_default = COALESCE(${is_default}, is_default),
        is_active = COALESCE(${is_active}, is_active),
        transfer_note_template = COALESCE(${transfer_note_template}, transfer_note_template),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE: Delete a bank account ──────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error, response } = await verifyAdminRequest(request, 'system:config' as any);
    if (error) return response;

    await sql`DELETE FROM bank_accounts WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
