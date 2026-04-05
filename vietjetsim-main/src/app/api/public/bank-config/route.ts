import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';

export async function GET(request: NextRequest) {
  try {
    const settings = await sql`
      SELECT key, value
      FROM system_config
      WHERE key IN ('admin_bank_name', 'admin_bank_account_holder', 'admin_bank_account_number')
    `;

    const bankConfig: Record<string, string> = {
      admin_bank_name: 'Vietcombank',
      admin_bank_account_holder: 'CONG TY VIETJET SIM',
      admin_bank_account_number: '1234 5678 9012',
    };

    settings.forEach((s: any) => {
      bankConfig[s.key] = s.value;
    });

    return NextResponse.json({ bankConfig });
  } catch (error) {
    console.error('Error fetching bank config:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
