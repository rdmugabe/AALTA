# Base stage for all images
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/scoring/package.json ./packages/scoring/
RUN npm ci

# Build shared packages
FROM base AS builder-packages
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@aalta/shared
RUN npm run build --workspace=@aalta/ui
RUN npm run build --workspace=@aalta/scoring

# Build API
FROM base AS builder-api
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder-packages /app/packages ./packages
COPY apps/api ./apps/api
COPY turbo.json package.json tsconfig.json ./
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Build Web
FROM base AS builder-web
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder-packages /app/packages ./packages
COPY apps/web ./apps/web
COPY turbo.json package.json tsconfig.json ./
WORKDIR /app/apps/web
RUN npm run build

# Production API image
FROM base AS api
ENV NODE_ENV=production
COPY --from=builder-api /app/node_modules ./node_modules
COPY --from=builder-api /app/apps/api/dist ./dist
COPY --from=builder-api /app/apps/api/prisma ./prisma
COPY --from=builder-api /app/apps/api/node_modules/.prisma ./node_modules/.prisma
EXPOSE 4000
CMD ["node", "dist/index.js"]

# Production Web image
FROM base AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder-web /app/apps/web/.next/standalone ./
COPY --from=builder-web /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder-web /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
