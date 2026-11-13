# CHI TIẾT TRIỂN KHAI — ADMIN DASHBOARD (PHASE 1)

**Phiên bản:** 1.0  
**Ngày:** 2026-11-14  
**Mục tiêu:** Xây dựng trang Dashboard Quản trị với KPI widgets và biểu đồ Recharts  
**Người thực hiện:** Frontend + Backend developer  
**Thời gian ước tính:** 4–5 ngày

---

## 1. Tổng quan trang Dashboard

**URL:** `/quan-tri` (thay thế hoặc mở rộng `AdminDashboardClient` hiện tại)

**Layout chính (3 phần):**

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: "Bảng điều khiển" + Ngày + Nút "Làm mới"           │
├─────────────────────────────────────────────────────────────┤
│  KPI WIDGETS (4 cột)                                        │
│  [Bookings hôm nay] [Doanh thu hôm nay] [User active] [Load]│
├─────────────────────────────────────────────────────────────┤
│  BIỂU ĐỒ (2 cột)                                            │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ Doanh thu 30 ngày    │  │ Phân bố hạng ghế (Pie)       │ │
│  │ (Line + Bar)         │  │                              │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ Top 5 route          │  │ Tỷ lệ hủy booking (Donut)    │ │
│  │ (Bar horizontal)     │  │                              │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  BẢNG DỮ LIỆU NHANH                                         │
│  - 10 booking mới nhất                                      │
│  - 5 chuyến bay sắp cất cánh                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu trúc file cần tạo / sửa

### 2.1. Frontend Components (Tạo mới)

```
src/features/admin/
├── components/
│   ├── AdminDashboardClient.tsx          ← Sửa file hiện tại
│   ├── KPIWidget.tsx                     ← Mới
│   ├── RevenueChart.tsx                  ← Mới
│   ├── SeatClassPieChart.tsx             ← Mới
│   ├── TopRoutesBarChart.tsx             ← Mới
│   ├── CancellationDonutChart.tsx        ← Mới
│   ├── RecentBookingsTable.tsx           ← Mới
│   └── UpcomingFlightsTable.tsx          ← Mới
├── hooks/
│   └── useAdminDashboard.ts              ← Mới (fetch + polling)
├── types/
│   └── dashboard.ts                      ← Mới
└── services/
    └── dashboard.service.ts              ← Mới (gọi API)
```

### 2.2. API Endpoints (Tái sử dụng hoặc tạo mới)

**Tái sử dụng (đã có):**
- `GET /api/quan-tri/doanh-thu` → Doanh thu
- `GET /api/quan-tri/dat-ve` → Danh sách booking
- `GET /api/quan-tri/chuyen-bay` → Danh sách chuyến bay

**Cần bổ sung (khuyến nghị):**

| Method | Endpoint | Mô tả | Trả về |
|--------|----------|-------|--------|
| GET | `/api/quan-tri/dashboard/kpi` | 4 chỉ số KPI hôm nay | `{ bookingsToday, revenueToday, activeUsers, loadFactor }` |
| GET | `/api/quan-tri/dashboard/revenue?days=30` | Doanh thu theo ngày | `[{ date, revenue, bookings }]` |
| GET | `/api/quan-tri/dashboard/seat-distribution` | Tỷ lệ hạng ghế | `[{ class, count, percent }]` |
| GET | `/api/quan-tri/dashboard/top-routes?limit=5` | Top route | `[{ route, bookings, revenue }]` |
| GET | `/api/quan-tri/dashboard/cancellation-rate` | Tỷ lệ hủy | `{ total, cancelled, rate }` |

> **Lưu ý:** Có thể gộp 4 API trên thành **1 API duy nhất** `/api/quan-tri/dashboard/summary` để giảm số request (khuyến nghị).

---

## 3. TypeScript Types (src/features/admin/types/dashboard.ts)

```ts
export interface KPIData {
  bookingsToday: number;
  revenueToday: number;
  activeUsers: number;
  loadFactor: number; // 0-100
}

export interface RevenuePoint {
  date: string;      // '2026-11-01'
  revenue: number;
  bookings: number;
}

export interface SeatDistribution {
  class: 'Economy' | 'Business' | 'First';
  count: number;
  percent: number;
}

export interface TopRoute {
  route: string;     // 'SGN-HAN'
  bookings: number;
  revenue: number;
}

export interface DashboardSummary {
  kpi: KPIData;
  revenue: RevenuePoint[];
  seatDistribution: SeatDistribution[];
  topRoutes: TopRoute[];
  cancellationRate: { total: number; cancelled: number; rate: number };
  recentBookings: BookingSummary[];
  upcomingFlights: FlightSummary[];
}
```

---

## 4. Component chi tiết (mẫu)

### 4.1. KPIWidget.tsx

```tsx
interface KPIWidgetProps {
  title: string;
  value: string | number;
  change?: number;        // +12.5%
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

export function KPIWidget({ title, value, change, icon, trend }: KPIWidgetProps) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="text-3xl text-[var(--primary)]">{icon}</div>
      </div>
      {change !== undefined && (
        <div className={`mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? '+' : ''}{change}% so với hôm qua
        </div>
      )}
    </div>
  );
}
```

### 4.2. RevenueChart.tsx (Recharts)

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, ComposedChart } from 'recharts';

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="bookings" fill="#e0e7ff" />
        <Line type="natural" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

---

## 5. Hook `useAdminDashboard.ts`

```ts
import { useState, useEffect } from 'react';
import { getDashboardSummary } from '../services/dashboard.service';

export function useAdminDashboard(pollIntervalMs = 30000) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await getDashboardSummary();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);

  return { data, loading, error, refetch: fetchData };
}
```

---

## 6. Service Layer (dashboard.service.ts)

```ts
import { apiClient } from '@/shared/services/apiClient';
import type { DashboardSummary } from '../types/dashboard';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get('/api/quan-tri/dashboard/summary');
}
```

---

## 7. Backend — API `/api/quan-tri/dashboard/summary/route.ts` (Mới)

**Yêu cầu:**
- Chỉ cho phép role `admin`
- Dùng 4-5 query song song (Promise.all)
- Cache 30-60 giây (optional nhưng khuyến nghị)

**Ví dụ query chính:**

```sql
-- KPI hôm nay
SELECT 
  COUNT(*) as bookings_today,
  COALESCE(SUM(total_amount), 0) as revenue_today
FROM bookings 
WHERE DATE(created_at) = CURRENT_DATE;

-- Doanh thu 30 ngày
SELECT 
  DATE(created_at) as date,
  SUM(total_amount) as revenue,
  COUNT(*) as bookings
FROM bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## 8. Checklist triển khai

- [ ] Tạo types `dashboard.ts`
- [ ] Tạo service `dashboard.service.ts`
- [ ] Tạo 6 component con (KPI, 4 chart, 2 table)
- [ ] Tạo hook `useAdminDashboard`
- [ ] Sửa `AdminDashboardClient.tsx` ghép layout
- [ ] Tạo API `/api/quan-tri/dashboard/summary` (hoặc 4 API nhỏ)
- [ ] Thêm loading skeleton + error state
- [ ] Test responsive (mobile + desktop)
- [ ] Thêm nút "Làm mới" thủ công
- [ ] Viết test vitest cho hook + service (optional)

---

## 9. Ghi chú quan trọng

1. **Performance:** Dashboard gọi nhiều query → nên có cache hoặc gộp thành 1 API.
2. **Realtime:** Dùng `pollIntervalMs = 30000` là đủ. Không cần SSE ở Phase 1.
3. **Styling:** Dùng class Tailwind hiện có của dự án (`rounded-vj`, `bg-[var(--surface)]`...).
4. **Icon:** Dùng `@heroicons/react` (đã có dependency).

---

**File này đủ chi tiết để developer khác implement mà không cần hỏi thêm.**

