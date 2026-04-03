# 🛫 VietjetSim — Vietnam Flight Booking Simulator

A complete **Vietjet Air booking experience simulator** built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Search domestic Vietnam flights, select seats, manage bookings, and access a full admin panel.

## 🚀 Features

- **Next.js 15** (App Router) with React 19 & TypeScript
- **Tailwind CSS** with custom Vietjet brand theme
- **Supabase** for Auth, Database, and Realtime Chat
- **Role-based Access Control** (User / Admin)
- **Flight Search & Booking** with seat selection
- **Payment Simulation** with booking management
- **Realtime Admin Chat** support system
- **Responsive Design** matching Vietjet's UI/UX
- **Server-side Middleware** for route protection
- **Error Boundaries** with variant-specific fallbacks
- **Toast Notifications** system

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

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:4028
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

> 🔑 Get your Supabase keys from: [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)

### 3. Database Setup
Run the migrations in your Supabase SQL Editor:
1. Go to **Supabase Dashboard → SQL Editor**
2. Run all files in `supabase/migrations/` in order:
   - `20260317051514_chat_module.sql`
   - `20260317060000_chat_presence.sql`
   - `20260317161000_refund_requests.sql`
   - `20260317170000_fix_refund_requests_fk.sql`
   - `20260317181346_notifications_hub.sql`
   - `20260318100000_rbac_user_admin.sql`
   - `20260320000000_complete_schema.sql` ⭐ **Main schema**

Or run the complete schema file which includes all tables, RLS policies, indexes, and seed data.

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
│   │   └── AuthContext.tsx     # Supabase auth provider
│   ├── hooks/
│   │   ├── useErrorHandler.ts  # Async error classification
│   │   └── useToast.ts         # Toast notification hook
│   ├── lib/
│   │   ├── supabase/           # Supabase client setup
│   │   ├── neon/               # Neon DB client
│   │   └── rbac.ts             # Role-based access control
│   ├── types/
│   │   └── database.ts         # TypeScript interfaces
│   └── styles/
│       └── tailwind.css        # Global styles & animations
├── supabase/migrations/        # Database schema migrations
├── middleware.ts               # Server-side auth protection
├── next.config.mjs             # Next.js configuration
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
| `chat_conversations` | Support chat threads |
| `chat_messages` | Chat message history |
| `chat_presence` | Online/typing status |
| `refund_requests` | Refund application tracking |
| `notifications` | User notification hub |

All tables have **Row Level Security (RLS)** policies for data isolation.

## 🔐 Default Test Accounts

| Email | Password | Role |
|-------|----------|------|
| `user@vietjetsim.vn` | `user123` | User |
| `admin@vietjetsim.vn` | `admin123` | Admin |

> ⚠️ These are mock credentials for development. Create real accounts via Supabase Auth for production.

## 🎨 Styling

This project uses **Tailwind CSS** with a custom Vietjet brand theme:

- **Fonts**: KoHo (body) + Be Vietnam Pro (headings)
- **Colors**: Vietjet red `#EC2029`, yellow `#FFD400`, navy `#1A2948`
- **Shadows**: Custom Vietjet depth scale (`vj-xs` to `vj-2xl`)
- **Animations**: `fade-in-up`, `slide-in-blur`, `vj-float`, `shimmer`
- **Gradients**: Brand-specific gradients for buttons, headers, cards
- **Responsive**: Mobile-first with breakpoints for all screen sizes

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

- **TypeScript & ESLint** are enabled during builds (no `ignoreBuildErrors`)
- **Server-side middleware** protects routes at the edge
- **Supabase RLS** ensures data isolation between users
- **Mock auth** can be enabled via `NEXT_PUBLIC_USE_MOCK_AUTH=true` for local testing without Supabase

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js 15, React 19, and Supabase
- Styled with Tailwind CSS & Vietjet brand guidelines

Built with ❤️ on Rocket.new