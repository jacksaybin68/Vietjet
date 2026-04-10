import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: Get all system settings ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'system:config');
    if (error) return response;

    const settings = await sql`
      SELECT id, key, value, description, updated_at
      FROM system_config
      ORDER BY key ASC
    `;

    // Transform to key-value object for easier frontend consumption
    const settingsObject: Record<string, { value: string; description?: string }> = {};
    settings.forEach((setting: any) => {
      settingsObject[setting.key] = {
        value: setting.value || '',
        description: setting.description,
      };
    });

    return NextResponse.json({
      settings,
      settingsObject,
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update system settings ──────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'system:config');
    if (error) return response;

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Settings object is required' },
        { status: 400 }
      );
    }

    const updatedSettings: any[] = [];

    // Process each setting
    for (const [key, valueObj] of Object.entries(settings)) {
      const value = (valueObj as any).value;
      
      if (value === undefined) continue;

      // Upsert each setting
      const [setting] = await sql`
        INSERT INTO system_config (key, value, updated_at)
        VALUES (${key}, ${String(value)}, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = NOW()
        RETURNING *
      `;

      updatedSettings.push(setting);
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update system settings' },
      { status: 500 }
    );
  }
}
