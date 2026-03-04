FROM node:20-slim

# Install dependencies for Puppeteer and Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files and tsconfig
COPY package.json package-lock.json tsconfig.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/scoring/package.json ./packages/scoring/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/scoring ./packages/scoring
COPY apps/api ./apps/api

# Build packages with turborepo
RUN npx turbo run build --filter=@aalta/shared --filter=@aalta/scoring

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Start the server
CMD ["npx", "tsx", "src/index.ts"]
