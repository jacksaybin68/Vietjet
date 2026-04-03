import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { verifyAccessToken } from '@/lib/auth';
import { getAllFlights, createFlight, updateFlight, deleteFlight } from '@/lib/db';

// ─── GET: Get all flights with pagination and filters ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { payload, error, response } = await verifyAdminRequest(request, 'flight:list');
    if (error || !response) return response!;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const from_code = searchParams.get('from_code') || undefined;
    const to_code = searchParams.get('to_code') || undefined;
    const status = searchParams.get('status') || undefined;

    const filters: { from_code?: string; to_code?: string; status?: string } = {};
    if (from_code) filters.from_code = from_code;
    if (to_code) filters.to_code = to_code;
    if (status) filters.status = status;

    const { flights, total } = await getAllFlights({
      page,
      limit,
      from_code,
      to_code,
    });

    return NextResponse.json({
      flights,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin flights:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch flights' },
      { status: 500 }
    );
  }
}

// ─── POST: Create a new flight ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      flight_no,
      from_code,
      to_code,
      depart_time,
      arrive_time,
      price,
      class: seatClass,
      available,
    } = body;

    // Validation
    if (
      !flight_no ||
      !from_code ||
      !to_code ||
      !depart_time ||
      !arrive_time ||
      price === undefined ||
      !seatClass ||
      available === undefined
    ) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'All flight fields are required' },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    if (available < 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Available seats cannot be negative' },
        { status: 400 }
      );
    }

    const flight = await createFlight({
      flight_no,
      from_code,
      to_code,
      depart_time,
      arrive_time,
      price,
      class: seatClass,
      available,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Flight created successfully',
        flight,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating flight:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create flight' },
      { status: 500 }
    );
  }
}

// ─── PUT: Update a flight ────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { flight_id, ...updates } = body;

    if (!flight_id) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'flight_id is required' },
        { status: 400 }
      );
    }

    const updatedFlight = await updateFlight(flight_id, updates);

    if (!updatedFlight) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Flight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Flight updated successfully',
      flight: updatedFlight,
    });
  } catch (error) {
    console.error('Error updating flight:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update flight' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a flight ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);

    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('flight_id');

    if (!flightId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'flight_id is required' },
        { status: 400 }
      );
    }

    await deleteFlight(flightId);

    return NextResponse.json({
      success: true,
      message: 'Flight deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting flight:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete flight' },
      { status: 500 }
    );
  }
}
