import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { verifyAdminRequest } from '@/lib/admin-auth';

// ─── GET: Get all announcements with pagination and filters ──────────────────

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'announcement:crud');
    if (error) return response;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const isActive = searchParams.get('is_active');
    const offset = (page - 1) * limit;

    // Build dynamic query based on filters
    let announcements;
    let total = 0;

    if (search && type && isActive) {
      const result = await sql`
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
        WHERE (a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'})
          AND a.type = ${type}
          AND a.is_active = ${isActive === 'true'}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      announcements = result;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM announcements a
        WHERE (a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'})
          AND a.type = ${type}
          AND a.is_active = ${isActive === 'true'}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (search && type) {
      const result = await sql`
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
        WHERE (a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'})
          AND a.type = ${type}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      announcements = result;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM announcements a
        WHERE (a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'})
          AND a.type = ${type}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (search) {
      const result = await sql`
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
        WHERE a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      announcements = result;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM announcements a
        WHERE a.title ILIKE ${'%' + search + '%'} OR a.content ILIKE ${'%' + search + '%'}
      `;
      total = Number(countResult[0]?.total || 0);
    } else if (type) {
      const result = await sql`
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
        WHERE a.type = ${type}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      announcements = result;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM announcements a
        WHERE a.type = ${type}
      `;
      total = Number(countResult[0]?.total || 0);
    } else {
      const result = await sql`
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
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      announcements = result;

      const countResult = await sql`SELECT COUNT(*) as total FROM announcements a`;
      total = Number(countResult[0]?.total || 0);
    }

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
    if (error) return response;

    const body = await request.json();
    const {
      title,
      content,
      type = 'info',
      target_role = 'all',
      is_active = true,
      start_date,
      end_date,
      created_by,
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
