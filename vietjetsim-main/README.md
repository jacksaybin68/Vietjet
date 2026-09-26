# 🛫 Vietjet Air — Vietnam Flight Booking Simulator

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
# ... apply every file in migrations/ in filename order (000 → 017).
# 013 wires up the booking_code default and 014 seeds demo airports, flights
# and the demo accounts below, so a fresh database is usable immediately.
# 015 adds the `agencies` table and links discount codes to the agency an
# admin issued them to; apply it before using the "Đại lý" admin tab.
# 016 normalizes stored phone numbers, so apply it after 014/015.
# 017 adds the missing `bookings.discount_code_id` foreign key.
#
# CI runs a "Migrations" job that applies every file above to an empty
# PostgreSQL instance and then re-applies them, so ordering mistakes and
# non-idempotent statements fail the build instead of production.
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
│   │   ├── page.tsx            # Homepage (Hero, Routes, Deals)
│   │   ├── trang-chu/          # Landing page
│   │   ├── tim-ve/             # Flight search flow
│   │   ├── dat-ve/             # Booking detail & checkout
│   │   ├── thanh-toan/         # Payment processing
│   │   ├── dang-nhap/          # Sign in / sign up
│   │   ├── tai-khoan/          # User dashboard
│   │   ├── quan-tri/           # Admin panel (flights, users, revenue)
│   │   ├── chuyen-bay-cua-toi/ # My bookings
│   │   ├── lam-thu-tuc/        # Check-in
│   │   ├── tra-cuu/            # Booking lookup
│   │   └── api/                # API routes
│   ├── contexts/
│   │   └── AuthContext.tsx     # JWT auth provider (access/refresh cookies)
│   ├── features/               # Feature modules (auth, bookings, flights, …)
│   │   └── <name>/             # types/, constants.ts, services/, components/
│   ├── hooks/
│   │   ├── useCsrf.ts          # CSRF token hook + refresh helper
│   │   └── useToast.ts         # Toast notification hook
│   ├── lib/
│   │   ├── db.ts               # DB query layer (Neon SQL, user-scoped queries)
│   │   ├── neon.ts             # Neon client (falls back to in-memory mock)
│   │   ├── auth.ts             # JWT sign/verify, password hashing
│   │   ├── admin-auth.ts       # verifyAdminRequest helper
│   │   ├── csrf.ts             # CSRF token utils (server)
│   │   ├── csrf-client.ts      # CSRF cookie/header helpers (client)
│   │   ├── rate-limit.ts       # Edge-compatible rate limiter
│   │   ├── route-access.ts     # Public route/API classification
│   │   ├── pagination.ts       # Shared page/limit parsing & metadata
│   │   ├── rbac.ts             # Role-based access control (user/admin)
│   │   └── roles.ts            # Role helpers (isAdminRole)
│   ├── shared/                 # Shared UI, services, constants
│   │   ├── services/apiClient.ts  # apiRequest: cookies + CSRF + errors
│   │   ├── constants/          # API_ENDPOINTS, ROUTES, validation messages
│   │   └── components/         # ui/, layouts/, navigation/, feedback/
│   ├── test/                   # Vitest unit/integration tests
│   ├── types/
│   │   └── database.ts         # TypeScript interfaces
│   └── styles/
│       └── tailwind.css        # Global styles & animations
├── migrations/                 # SQL migrations (Neon Postgres)
├── src/proxy.ts                # Request proxy (JWT, rate limit; must sit at the same level as src/app)
├── next.config.mjs             # Next.js configuration (strict TS/ESLint builds)
├── vitest.config.mts           # Vitest config (jsdom, `@/` alias)
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
| `user@vietjetair.vn` | `user123` | User |
| `admin@vietjetair.vn` | `admin123` | Admin |

> ⚠️ These are mock credentials for development. Register a real account through the app and promote it via `npm run db:setup-admin` for production.

> ℹ️ They only exist **after the migrations above have been applied to a real
> Postgres database**. With `DATABASE_URL` empty the app uses the in-memory mock
> in `src/lib/neon.ts`, which seeds airports and a demo chat thread but has no
> `users` rows — every login attempt there fails with 401 regardless of the
> credentials.

If these accounts already exist in your database with different passwords, migration
`014_seed_demo_data.sql` will not touch them (`ON CONFLICT (email) DO NOTHING`). Run
`npm run db:seed-demo` to reset them to the credentials above.

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

The suite (23 test files, 225 tests) covers:
- **Wallet & payments** (topup/withdraw/refund validation, double-entry checks)
- **Admin refund workflow** (seat release + wallet credit)
- **Edge JWT contract** (HS256 pinning, expiry enforcement, signature checks)
- **RBAC** (role checks, permission gates)
- **Auth** (bcrypt hashing, token generation/expiry)
- **CSRF, API security & route access** (private vs. unauthenticated routes)
- **Login hardening** (account lockout, 2FA, session tracking)
- **Booking flow** (validation rules) & **pagination helpers**

Route handlers are exercised directly with a real `NextRequest` and a real JWT;
`@/lib/neon` is mocked so no live database is needed.

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 4028 |
| `npm run build` | Build for production |
| `npm run start` | Start production server on port 4028 |
| `npm run serve` | Start production server (default port) |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Run TypeScript type checking |
| `npm test` | Run the Vitest suite |
| `npm run test:smoke` | HTTP smoke test against a running server (defaults to `http://localhost:4028`, override with `SMOKE_BASE_URL`) |
| `npm run db:check` | Validate DB connectivity & schema |
| `npm run db:setup-admin` | Promote a user to admin role |
| `npm run db:seed-demo` | Reset the two README demo accounts to their documented passwords |

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
- **Server-side proxy** verifies JWT before routing (HS256-only, expiry enforced)
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