# 📋 RESTRUCTURING PLAN - VietjetSim Project

**Date**: 2026-09-02  
**Status**: Optimization Plan  
**Target**: Better Code Organization & Maintainability

---

## 🎯 Mục Tiêu

Tổ chức lại dự án để:
- ✅ Dễ bảo trì & mở rộng
- ✅ Tìm kiếm files nhanh hơn
- ✅ Separation of concerns rõ ràng
- ✅ Code reusability tối đa
- ✅ Team collaboration hiệu quả

---

## 📂 CẤAU TRÚC HIỆN TẠI vs TỐI ƯU

### ❌ Vấn Đề Hiện Tại

```
src/
├── app/                    # Routes lẫn lộn
│   ├── api/               # API endpoints chưa được nhóm
│   ├── trang-chu/         # Feature pages
│   ├── tai-khoan/         # User dashboard
│   └── thanh-toan/        # Payment
├── components/            # Tất cả components ở đây
│   ├── auth/
│   ├── chat/
│   └── ui/
├── lib/                   # Multiple sub-folders (neon, openclaw, supabase)
├── contexts/              # Auth, Theme
├── hooks/                 # Custom hooks
└── types/                 # Database types
```

**Vấn đề:**
- 🔴 API endpoints chưa được nhóm theo feature
- 🔴 Components lớn trong folder page (trang-chu, tai-khoan)
- 🔴 Lib folder có quá nhiều concerns
- 🔴 Utils/helpers không có folder riêng
- 🔴 Constants phân tán khắp nơi
- 🔴 Services & API clients không rõ ràng

---

## ✅ CẤAU TRÚC TỐI ƯU (Đề Xuất)

```
src/
│
├── app/                              # Next.js App Router
│   ├── (public)/                     # Public routes group
│   │   ├── trang-chu/
│   │   ├── dang-nhap/
│   │   ├── dang-ky/
│   │   └── tim-ve/
│   ├── (protected)/                  # Protected routes group
│   │   ├── tai-khoan/               # User dashboard
│   │   ├── chuyen-bay-cua-toi/      # My bookings
│   │   └── thanh-toan/               # Payment
│   ├── (admin)/                      # Admin-only routes
│   │   ├── quan-tri/
│   │   ├── quan-li-chuyen-bay/
│   │   └── quan-li-nguoi-dung/
│   ├── api/                          # Organized API routes
│   │   ├── auth/                     # Auth endpoints
│   │   ├── flights/                  # Flight management
│   │   ├── bookings/                 # Booking management
│   │   ├── payments/                 # Payment processing
│   │   ├── users/                    # User management
│   │   └── admin/                    # Admin operations
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── error.tsx
│
├── features/                         # Feature modules (NEW)
│   ├── flights/
│   │   ├── components/              # Flight-specific components
│   │   ├── hooks/                   # Flight-specific hooks
│   │   ├── services/                # Flight API services
│   │   ├── types/                   # Flight types
│   │   ├── utils/                   # Flight utilities
│   │   └── constants.ts             # Flight constants
│   ├── bookings/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants.ts
│   ├── payments/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants.ts
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── constants.ts
│   └── loyalty/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── constants.ts
│
├── shared/                          # Shared across features
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                      # Atomic components (Button, Input, etc)
│   │   ├── layouts/                 # Layout components
│   │   ├── navigation/              # Header, Footer, Nav
│   │   └── feedback/                # Toast, Modal, etc
│   ├── hooks/                       # Shared custom hooks
│   ├── services/                    # Shared API clients
│   ├── types/                       # Shared types
│   ├── utils/                       # Helper functions
│   ├── constants/                   # Global constants
│   └── styles/                      # Global styles
│
├── lib/                             # External integrations (Organized)
│   ├── supabase/                    # Supabase client setup
│   ├── neon/                        # Neon DB client
│   ├── payment-gateways/            # Payment integrations
│   └── external-apis/               # Third-party APIs
│
├── contexts/                        # Global context providers
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   ├── NotificationContext.tsx
│   └── DialogContext.tsx
│
├── middleware.ts                    # Route middleware
├── tailwind.config.js              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── next.config.mjs                 # Next.js config
```

---

## 📊 RESTRUCTURING STEPS

### Phase 1: Setup Folder Structure (30 mins)
```bash
# Create feature modules
mkdir -p src/features/{flights,bookings,payments,auth,loyalty}
for feature in flights bookings payments auth loyalty; do
  mkdir -p src/features/$feature/{components,hooks,services,types,utils}
  touch src/features/$feature/constants.ts
done

# Create shared folder
mkdir -p src/shared/{components/{ui,layouts,navigation,feedback},hooks,services,types,utils,constants,styles}

# Create lib organization
mkdir -p src/lib/{supabase,neon,payment-gateways,external-apis}
```

### Phase 2: Organize API Routes (45 mins)
```
src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── register/route.ts
│   └── refresh/route.ts
├── flights/
│   ├── route.ts              # List flights
│   ├── [id]/route.ts         # Get flight details
│   └── search/route.ts       # Search flights
├── bookings/
│   ├── route.ts              # Create/list bookings
│   ├── [id]/route.ts         # Get/update booking
│   └── cancel/route.ts       # Cancel booking
├── payments/
│   ├── route.ts              # Payment info
│   ├── process/route.ts      # Process payment
│   └── history/route.ts      # Payment history
├── users/
│   ├── profile/route.ts      # User profile
│   └── preferences/route.ts  # User settings
└── admin/
    ├── flights/route.ts      # Admin flight management
    └── users/route.ts        # Admin user management
```

### Phase 3: Move Components (60 mins)
```
# Flights feature components
src/features/flights/components/
├── FlightCard.tsx
├── FlightFilters.tsx
├── FlightSearchForm.tsx
└── FlightSortOptions.tsx

# Bookings feature components
src/features/bookings/components/
├── BookingForm.tsx
├── BookingSummary.tsx
├── SeatSelector.tsx
└── PassengerForm.tsx

# Shared UI components
src/shared/components/ui/
├── Button.tsx
├── Input.tsx
├── Select.tsx
├── Modal.tsx
├── Card.tsx
└── Badge.tsx

src/shared/components/navigation/
├── Header.tsx
├── Footer.tsx
├── Navigation.tsx
└── Breadcrumb.tsx
```

### Phase 4: Consolidate Services (45 mins)
```
src/features/flights/services/
├── flightApi.ts        # API calls
├── flightQuery.ts      # React Query integration
└── flightCache.ts      # Caching logic

src/features/bookings/services/
├── bookingApi.ts
├── bookingQuery.ts
└── bookingValidation.ts

src/shared/services/
├── httpClient.ts       # Axios/Fetch wrapper
└── errorHandler.ts     # Centralized error handling
```

### Phase 5: Organize Constants (30 mins)
```
src/shared/constants/
├── api.constants.ts    # API endpoints
├── routes.constants.ts # Route paths
├── time.constants.ts   # Time/date formats
├── validation.constants.ts
└── features.constants.ts

src/features/flights/constants.ts
src/features/bookings/constants.ts
src/features/payments/constants.ts
```

---

## 🔄 MIGRATION CHECKLIST

### Before Migration
- [ ] Backup current project (`git commit`)
- [ ] Run full test suite
- [ ] Document current structure
- [ ] Plan breaking changes

### During Migration
- [ ] Create new folder structure
- [ ] Move files incrementally
- [ ] Update imports (use IDE refactor)
- [ ] Keep old structure during transition
- [ ] Test each feature after move

### After Migration
- [ ] Run all tests
- [ ] Update documentation
- [ ] Delete old folders
- [ ] Commit & create PR
- [ ] Team review & approval

---

## 📝 NAMING CONVENTIONS

### Files
```typescript
// Feature modules
features/flights/components/FlightCard.tsx
features/flights/services/flightApi.ts
features/flights/hooks/useFlights.ts
features/flights/types/flight.types.ts
features/flights/utils/flightHelpers.ts
features/flights/constants.ts

// Shared utilities
shared/components/ui/Button.tsx
shared/services/httpClient.ts
shared/hooks/useAsync.ts
shared/types/api.types.ts
shared/utils/formatDate.ts
shared/constants/routes.ts
```

### Exports
```typescript
// Use barrel exports for cleaner imports
// features/flights/index.ts
export * from './components'
export * from './hooks'
export * from './services'
export * from './types'

// Import example
import { FlightCard, useFlights, flightApi } from '@/features/flights'
```

---

## 🎯 IMPORT PATHS SETUP

Add path aliases in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/app/*": ["./src/app/*"]
    }
  }
}
```

**Usage:**
```typescript
// Before
import Button from '../../components/ui/Button'

// After
import { Button } from '@/shared/components/ui'
import { FlightCard } from '@/features/flights/components'
```

---

## 📊 BENEFITS

| Aspect | Before | After |
|--------|--------|-------|
| **File Discovery** | Hard (same level folders) | Easy (feature-based) |
| **Code Duplication** | High | Low (shared folder) |
| **Team Onboarding** | Slow | Fast (clear structure) |
| **Testing** | Scattered | Organized |
| **Scalability** | Limited | Excellent |
| **Maintenance** | Difficult | Easy |

---

## ⏱️ TIMELINE

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Setup folders | 30 min |
| 2 | Organize API routes | 45 min |
| 3 | Move components | 60 min |
| 4 | Consolidate services | 45 min |
| 5 | Organize constants | 30 min |
| **Total** | **Complete restructure** | **≈ 3.5 hours** |

---

## 🚀 NEXT STEPS

1. **Review this plan** with team
2. **Create feature branch**: `git checkout -b feat/restructuring`
3. **Execute Phase 1-2** (folder setup)
4. **Move files incrementally** (Phase 3-5)
5. **Update all imports** (use IDE refactor)
6. **Test thoroughly** (each feature)
7. **Commit & create PR** for review

---

**Generated**: 2026-09-02 15:32 UTC+7  
**Status**: ✅ READY FOR IMPLEMENTATION
