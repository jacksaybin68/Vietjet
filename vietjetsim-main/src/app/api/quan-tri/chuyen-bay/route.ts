import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAllFlights, createFlight, updateFlight, deleteFlight } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:list');
    if (error) return response;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const from_code = searchParams.get('from_code') || undefined;
    const to_code = searchParams.get('to_code') || undefined;
    const { flights, total } = await getAllFlights({ page, limit, from_code, to_code });
    return NextResponse.json({
      flights,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching admin flights:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:create');
    if (error) return response;
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
      { success: true, message: 'Flight created successfully', flight },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating flight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:edit');
    if (error) return response;
    const body = await request.json();
    const { flight_id, ...updates } = body;
    if (!flight_id)
      return NextResponse.json(
        { error: 'Bad Request', message: 'flight_id is required' },
        { status: 400 }
      );
    const updatedFlight = await updateFlight(flight_id, updates);
    if (!updatedFlight)
      return NextResponse.json(
        { error: 'Not Found', message: 'Flight not found' },
        { status: 404 }
      );
    return NextResponse.json({
      success: true,
      message: 'Flight updated successfully',
      flight: updatedFlight,
    });
  } catch (error) {
    console.error('Error updating flight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error, response } = await verifyAdminRequest(request, 'flight:delete');
    if (error) return response;
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('flight_id');
    if (!flightId)
      return NextResponse.json(
        { error: 'Bad Request', message: 'flight_id is required' },
        { status: 400 }
      );
    await deleteFlight(flightId);
    return NextResponse.json({ success: true, message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Error deleting flight:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
