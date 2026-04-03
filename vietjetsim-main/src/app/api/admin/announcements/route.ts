import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: Get all announcements with pagination and filters ──────────────────

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'announcement:crud');
    if (error || !response) return response!;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const isActive = searchParams.get('is_active');
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        title ILIKE $${paramIndex} OR 
        content ILIKE $${paramIndex}
      )`);
      params.push('%' + search + '%');
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (isActive !== null && isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      params.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const announcementsQuery = sql`
      SELECT 
        a.id, 
        a.title, 
        a.content, 
        a.type, 
        a.target_role, 
        a.is_active,
        a.start_date,
        a.end_date,
        a.created_at,
        a.updated_at,
        u.full_name as created_by_name
      FROM announcements a
      LEFT JOIN user_profiles u ON a.created_by = u.id
      ${whereClause ? sql.unsafe(whereClause) : sql``}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `.params(...params);

    // Build params for count query
    const countParams = params.slice(0, whereConditions.filter(c => !c.includes('ILIKE') || search).length);
    
    const countQuery = sql`
      SELECT COUNT(*) as total FROM announcements a
      ${whereClause ? sql.unsafe(whereClause) : sql``}
    `.params(...params);

    const [announcements, countResult] = await Promise.all([
      announcementsQuery,
      countQuery
    ]);
    
    const total = Number(countResult[0]?.total || 0);

    return NextResponse.json({
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new announcement ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'announcement:crud');
    if (error || !response) return response!;

    const body = await request.json();
    const { 
      title, 
      content, 
      type = 'info', 
      target_role = 'all',
      is_active = true,
      start_date,
      end_date,
      created_by 
    } = body;

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Title and content are required' },
        { status: 400 }
      );
    }

    const validTypes = ['info', 'warning', 'promotion', 'system'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid announcement type' },
        { status: 400 }
      );
    }

    const [announcement] = await sql`
      INSERT INTO announcements (
        title, content, type, target_role, is_active, start_date, end_date, created_by
      )
      VALUES (
        ${title}, 
        ${content}, 
        ${type}, 
        ${target_role}, 
        ${is_active}, 
        ${start_date || null}, 
        ${end_date || null},
        ${created_by || null}
      )
      RETURNING *
    `;

    return NextResponse.json(
      { success: true, announcement, message: 'Announcement created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create announcement' },
      { status: 500 }
    );
  }
}
