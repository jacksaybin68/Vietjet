import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getFlightById, updateFlight, insertFlightUpdateLog } from '@/lib/db';

// ─── Allowed update fields & their validators ────────────────────────────────

const ALLOWED_FIELDS = [
  'flight_no',
  'from_code',
  'to_code',
  'depart_time',
  'arrive_time',
  'status',
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

const FIELD_LABELS: Record<AllowedField, string> = {
  flight_no: 'Số hiệu chuyến bay',
  from_code: 'Điểm đi',
  to_code: 'Điểm đến',
  depart_time: 'Thời gian khởi hành',
  arrive_time: 'Thời gian đến',
  status: 'Trạng thái chuyến bay',
};

function validateField(field: AllowedField, value: any): string | null {
  if (value === undefined || value === null || value === '') {
    return `Trường ${FIELD_LABELS[field]} không được để trống`;
  }

  const strVal = String(value).trim();
  if (!strVal) return `Trường ${FIELD_LABELS[field]} không hợp lệ`;

  switch (field) {
    case 'flight_no':
      if (!/^[A-Z]{2}\s?\d{2,4}$/i.test(strVal.replace(/\s+/g, ' '))) {
        return 'Số hiệu chuyến bay không hợp lệ. Định dạng: VJ 101, VN001...';
      }
      break;

    case 'from_code':
    case 'to_code':
      if (!/^[A-Z]{3}$/.test(strVal.toUpperCase())) {
        return 'Mã sân bay phải gồm 3 chữ cái in hoa (ví dụ: HAN, SGN)';
      }
      break;

    case 'depart_time':
    case 'arrive_time': {
      const d = new Date(strVal);
      if (isNaN(d.getTime())) {
        return `${FIELD_LABELS[field]} không phải là thời gian hợp lệ (ISO 8601)`;
      }
      break;
    }

    case 'status': {
      const validStatuses = ['active', 'cancelled', 'delayed', 'boarding', 'landed', 'scheduled'];
      if (!validStatuses.includes(strVal)) {
        return `Trạng thái "${strVal}" không hợp lệ. Các giá trị cho phép: ${validStatuses.join(', ')}`;
      }
      break;
    }
  }

  return null;
}

// ─── PATCH: Update a single flight with audit logging ─────────────────────

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // ─── 1. Admin Authentication + RBAC ──────────────────────────────
    const authResult = await verifyAdminRequest(request, 'flight:price_edit');
    if (authResult.error || authResult.response) return authResult.response!;

    // ─── 2. Resolve flight ID from dynamic route ──────────────────────────
    const { id } = await params;
    const flightId = id;

    // ─── 3. Parse & validate body ────────────────────────────────────────
    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Body request không phải JSON hợp lệ.' },
        { status: 400 }
      );
    }

    // Check at least one field is being updated
    const updateFields = ALLOWED_FIELDS.filter((f) => body[f] !== undefined);
    if (updateFields.length === 0) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Không có trường nào được cung cấp để cập nhật. Các trường cho phép: ${ALLOWED_FIELDS.join(', ')}`,
          allowedFields: [...ALLOWED_FIELDS],
          fieldLabels: FIELD_LABELS,
        },
        { status: 400 }
      );
    }

    // Validate each field
    const errors: string[] = [];
    for (const field of updateFields) {
      const err = validateField(field, body[field]);
      if (err) errors.push(err);
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation Error', message: errors.join('; '), details: errors },
        { status: 400 }
      );
    }

    // Business rule: depart_time must be before arrive_time
    if (body.depart_time && body.arrive_time) {
      const dep = new Date(body.depart_time);
      const arr = new Date(body.arrive_time);
      if (dep >= arr) {
        return NextResponse.json(
          { error: 'Validation Error', message: 'Thời gian khởi hành phải sớm hơn thời gian đến.' },
          { status: 400 }
        );
      }
    }

    // Business rule: from_code and to_code cannot be the same
    if (
      body.from_code &&
      body.to_code &&
      body.from_code.toUpperCase() === body.to_code.toUpperCase()
    ) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Điểm đi và điểm đến không được trùng nhau.' },
        { status: 400 }
      );
    }

    // ─── 4. Check flight exists (snapshot before update for logging) ──────
    const existingFlight = await getFlightById(flightId);
    if (!existingFlight) {
      return NextResponse.json(
        { error: 'Not Found', message: `Không tìm thấy chuyến bay với ID: ${flightId}` },
        { status: 404 }
      );
    }

    // ─── 5. Build changes array for logging ───────────────────────────────
    const changes: Array<{ field: string; label: string; oldValue: any; newValue: any }> = [];

    for (const field of updateFields) {
      const oldValue = (existingFlight as any)[field];
      let newValue = body[field];

      // Normalize values for comparison
      if (field === 'from_code' || field === 'to_code') {
        newValue = String(newValue).toUpperCase();
      }
      if (field === 'flight_no') {
        newValue = String(newValue).trim().replace(/\s+/, ' ').toUpperCase();
      }

      // Skip if value hasn't changed
      if (String(oldValue) === String(newValue)) continue;

      changes.push({
        field,
        label: FIELD_LABELS[field],
        oldValue,
        newValue,
      });
    }

    if (changes.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'Không có thay đổi nào cần cập nhật (giá trị không đổi).',
          flight: existingFlight,
        },
        { status: 200 }
      );
    }

    // ─── 6. Execute DB update ────────────────────────────────────────────
    const updates: Record<string, any> = {};
    for (const field of updateFields) {
      let val = body[field];
      if (field === 'from_code' || field === 'to_code') val = String(val).toUpperCase();
      if (field === 'flight_no') val = String(val).trim().replace(/\s+/, ' ').toUpperCase();
      updates[field] = val;
    }

    const updatedFlight = await updateFlight(flightId, updates);

    // ─── 7. Write audit log ──────────────────────────────────────────────
    try {
      // Extract client info
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

      const userAgent = request.headers.get('user-agent') || undefined;

      await insertFlightUpdateLog({
        flightId,
        flightNo: existingFlight.flight_no,
        updatedBy: authResult.payload!.userId || authResult.payload!.email || 'admin',
        changesJson: JSON.stringify(changes),
        previousSnapshot: JSON.stringify(existingFlight),
        ipAddress,
        userAgent,
      });
    } catch (logErr) {
      // Log failure should NOT fail the main request
      console.error('[AUDIT-LOG-ERROR] Failed to write flight update log:', logErr);
    }

    // ─── 8. Return success response with change details ──────────────────
    return NextResponse.json({
      success: true,
      message: `Cập nhật thành công ${changes.length} trường của chuyến bay ${existingFlight.flight_no}`,
      flight: updatedFlight,
      changes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[FLIGHT-UPDATE-ERROR]', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message:
          error instanceof Error
            ? error.message
            : 'Đã xảy ra lỗi khi cập nhật thông tin chuyến bay.',
      },
      { status: 500 }
    );
  }
}
