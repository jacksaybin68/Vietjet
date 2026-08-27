import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: Get all airports with pagination and search ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'airport:manage');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('q') || '';
    const offset = (page - 1) * limit;

    let query = sql`
      SELECT id, code, name, city, country, created_at
      FROM airports
      WHERE 1=1
    `;

    if (search) {
      query = sql`
        SELECT id, code, name, city, country, created_at
        FROM airports
        WHERE 
          code ILIKE ${'%' + search + '%'} OR
          name ILIKE ${'%' + search + '%'} OR
          city ILIKE ${'%' + search + '%'}
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT id, code, name, city, country, created_at
        FROM airports
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const countQuery = search
      ? sql`
          SELECT COUNT(*) as total
          FROM airports
          WHERE 
            code ILIKE ${'%' + search + '%'} OR
            name ILIKE ${'%' + search + '%'} OR
            city ILIKE ${'%' + search + '%'}
        `
      : sql`SELECT COUNT(*) as total FROM airports`;

    const [airports, countResult] = await Promise.all([query, countQuery]);
    const total = Number(countResult[0]?.total || 0);

    return NextResponse.json({
      airports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching airports:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch airports' },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new airport ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'airport:manage');
    if (error) return response;

    const body = await request.json();
    const { code, name, city, country = 'Vietnam' } = body;

    // Validation
    if (!code || !name || !city) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Code, name and city are required' },
        { status: 400 }
      );
    }

    if (code.length !== 3) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Airport code must be 3 characters' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await sql`
      SELECT id FROM airports WHERE code = ${code.toUpperCase()}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Airport code already exists' },
        { status: 409 }
      );
    }

    const [airport] = await sql`
      INSERT INTO airports (code, name, city, country)
      VALUES (${code.toUpperCase()}, ${name}, ${city}, ${country})
      RETURNING id, code, name, city, country, created_at
    `;

    return NextResponse.json(
      { success: true, airport, message: 'Airport created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating airport:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create airport' },
      { status: 500 }
    );
  }
}
