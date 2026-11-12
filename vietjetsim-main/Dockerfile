# syntax=docker/dockerfile:1

# 1. Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# 2. Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# `src/lib/neon.ts` throws at module scope when NODE_ENV=production and
# DATABASE_URL is missing, and `next build` imports route modules while
# collecting page data. Without a value here the build fails with
# "Failed to collect configuration for /api/checkin".
#
# This is a deliberately unreachable placeholder: it only has to exist so the
# module can be evaluated. It is not inlined into the bundle (only
# NEXT_PUBLIC_* variables are), and the real value is injected at runtime by
# the platform.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN npm run build

# 4. Runner (Optimized standalone < 150MB)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4028
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size (<150MB)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4028

CMD ["node", "server.js"]

