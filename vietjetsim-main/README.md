# 🛫 VietjetSim — Vietnam Flight Booking Simulator

A complete **Vietjet Air booking experience simulator** built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, and **Neon Serverless Postgres** with **custom JWT authentication**. Search domestic Vietnam flights, select seats, pay via wallet/card simulation, manage bookings, and access a full admin panel.

## 🚀 Features

- **Next.js 15** (App Router) with React 19 & TypeScript
- **Tailwind CSS** with custom Vietjet brand theme
- **Neon Serverless Postgres** (with in-memory mock fallback for local dev)
- **Custom JWT Auth** (15-minute access tokens + 7-day refresh tokens with rotation & reuse detection)
- **Edge Middleware** (JWT verification via WebCrypto, rate limiting, CSRF)
- **Role-based Access Control** (`user` / `admin`)
- **Flight Search & Booking** with seat selection & check-in system
- **Payment Simulation**: wallet, bank transfer, card — plus loyalty points
- **Realtime Admin Chat** support system
- **Notifications hub** & refund workflow with wallet credit
- **Responsive Design** matching Vietjet's UI/UX

## 🛠️ Installation

### 1. Install dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file and configure:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
# Neon (Serverless Postgres) connection string.
# Leave empty to use the in-memory mock database (development only).
DATABASE_URL=

# Generate with: openssl rand -hex 32
JWT_SECRET=replace-with-random-64-hex-chars
JWT_REFRESH_SECRET=replace-with-another-random-64-hex-chars

NEXT_PUBLIC_SITE_URL=http://localhost:4028
```

> 🔑 Get your Neon connection string from: [Neon Console](https://console.neon.tech) → Project → Connection Details

### 3. Database Setup
Run the SQL migrations in order against your Neon database (any psql client or the Neon SQL Editor):
```bash
psql "$DATABASE_URL" -f migrations/000_core_schema.sql
psql "$DATABASE_URL" -f migrations/001_bank_accounts.sql
# ... apply every file in migrations/ in filename order (000 → 012)
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:4028](http://localhost:4028) in your browser.

## 📁 Project Structure

```
vietjetsim-main/
├── public/                     # Static assets (favicon, images)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with AuthProvider
│   │   ├── homepage/           # Landing page (Hero, Routes, Deals)
│   │   ├── flight-booking/     # Flight search & booking flow
│   │   ├── sign-up-login/      # Authentication pages
│   │   ├── user-dashboard/     # User booking management
│   │   ├── admin-dashboard/    # Admin panel (flights, users, revenue)
│   │   ├── payment/            # Payment processing
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── Header.tsx          # 3-tier Vietjet-style header
│   │   ├── Footer.tsx
│   │   ├── ErrorBoundary.tsx   # Variant-aware error handling
│   │   ├── PageTransition.tsx  # Animated page transitions
│   │   ├── auth/               # ProtectedRoute, RoleBadge
│   │   ├── chat/               # Realtime UserChat
│   │   └── ui/                 # Toast, Pagination, Skeleton, etc.
│   ├── contexts/
│   │   └── AuthContext.tsx     # JWT auth provider (access/refresh cookies)
│   ├── hooks/
│   │   ├── useErrorHandler.ts  # Async error classification
│   │   └── useToast.ts         # Toast notification hook
│   ├── lib/
│   │   ├── db.ts               # DB query layer (monolith barrel)
│   │   ├── db/                 # Modular DB queries (Phase 3 target structure)
│   │   ├── neon.ts             # Neon client (or in-memory mock)
│   │   ├── auth.ts             # JWT sign/verify, password hashing
│   │   ├── admin-auth.ts       # verifyAdminRequest helper
│   │   ├── csrf.ts             # CSRF token utils
│   │   └── rbac.ts             # Role-based access control (user/admin)
│   ├── shared/                 # Shared UI & utilities
│   ├── test/                   # Vitest unit/integration tests (12 files)
│   ├── types/
│   │   └── database.ts         # TypeScript interfaces
│   └── styles/
│       └── tailwind.css        # Global styles & animations
├── migrations/                 # SQL migrations (000 → 012, Neon Postgres)
├── middleware.ts               # Edge middleware (JWT via WebCrypto, rate limit)
├── next.config.mjs             # Next.js configuration (strict TS/ESLint builds)
├── tailwind.config.js          # Vietjet brand theme
└── .env.local.example          # Environment template
```

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `user_profiles` | User accounts with roles (user/admin) |
| `airports` | Vietnam airport codes & details |
| `flights` | Flight schedules, pricing, availability |
| `seats` | Seat map per flight with class & occupancy |
| `bookings` | Booking records with status tracking |
| `passengers` | Passenger details per booking |
| `payments` | Payment transactions & gateway responses |
| `user_wallets` | Wallet balance per user (VND) |
| `wallet_transactions` | Wallet ledger (topup/withdraw/payment/refund/bonus) |
| `saved_payment_methods` | Linked cards & bank accounts |
| `discount_codes` | Promo codes with usage limits |
| `loyalty_*` | Loyalty tiers & points history |
| `chat_conversations` | Support chat threads |
| `chat_messages` | Chat message history |
| `chat_presence` | Online/typing status |
| `refund_requests` | Refund application tracking |
| `notifications` | User notification hub |

Data isolation is enforced at the **query layer** (every user-scoped query filters by
`user_id` from the verified JWT) plus **RBAC route guards** (`verifyAdminRequest`,
`verifyAuthRequest`). Wallet balance updates and payment/booking writes are wrapped
in transactions with compensating rollback on failure.

## 🔐 Default Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `user@vietjetsim.vn` | `user123` | User |
| `admin@vietjetsim.vn` | `admin123` | Admin |

> ⚠️ These are mock credentials for development. Register a real account through the app and promote it via `npm run db:setup-admin` for production.

## 🎨 Styling

This project uses **Tailwind CSS** with a custom Vietjet brand theme:

- **Fonts**: KoHo (body) + Be Vietnam Pro (headings)
- **Colors**: Vietjet red `#EC2029`, yellow `#FFD400`, navy `#1A2948`
- **Shadows**: Custom Vietjet depth scale (`vj-xs` to `vj-2xl`)
- **Animations**: `fade-in-up`, `slide-in-blur`, `vj-float`, `shimmer`
- **Gradients**: Brand-specific gradients for buttons, headers, cards
- **Responsive**: Mobile-first with breakpoints for all screen sizes

## 🧪 Testing

```bash
npm test          # or: npx vitest run
```

The suite (12 test files, 120+ tests) covers:
- **Wallet & payments** (topup/withdraw/refund validation, double-entry checks)
- **Admin refund workflow** (seat release + wallet credit)
- **Edge JWT contract** (HS256 pinning, expiry enforcement, signature checks)
- **RBAC** (role checks, permission gates)
- **Auth** (bcrypt hashing, token generation/expiry)
- **CSRF & rate limiting**
- **Booking flow** (validation rules)

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 4028 |
| `npm run build` | Build for production |
| `npm run start` | Start dev server (alias for dev) |
| `npm run serve` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript type checking |
| `npm run db:check` | Validate DB connectivity & schema |
| `npm run db:setup-admin` | Promote a user to admin role |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript type checking |

## 📱 Deployment

### Build for Production
```bash
npm run build
npm run serve
```

### Deploy to Vercel
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Deploy to Netlify
The project includes `@netlify/plugin-nextjs` for seamless deployment.

## ⚠️ Important Notes

- **TypeScript & ESLint errors FAIL the build** (`ignoreBuildErrors: false` — enforced CI gate)
- **Server-side middleware** verifies JWT at the edge (HS256-only, expiry enforced)
- **Data isolation** is enforced in query layer (user_id scoping) + RBAC route guards
- **JWT secrets** must be 64-char random hex (`openssl rand -hex 32`); rotate via refresh token family

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Neon Serverless Postgres](https://neon.tech/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js 15, React 19, and Neon Postgres
- Styled with Tailwind CSS & Vietjet brand guidelines

Built with ❤️ on Rocket.new