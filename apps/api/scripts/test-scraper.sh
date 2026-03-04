#!/bin/bash
# Test scraper from Docker container (to work around host Prisma connection issue)

set -e

echo "Running scraper test in Docker container..."

docker run --rm --network=aalta-network \
  -v /Users/richardmugabe/aalta:/workspace \
  -w /workspace/apps/api \
  -e DATABASE_URL='postgresql://aalta:aalta_dev_password@postgres:5432/aalta' \
  -e REDIS_URL='redis://redis:6379' \
  -e PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  -e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  node:20-slim sh -c "
    echo '=== Installing system dependencies ==='
    apt-get update -y
    apt-get install -y openssl chromium fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 xdg-utils

    echo '=== Installing npm packages ==='
    cd /workspace
    npm install --ignore-scripts

    echo '=== Generating Prisma client ==='
    cd /workspace/apps/api
    npx prisma generate

    echo '=== Running scraper ==='
    npx tsx src/scripts/run-scraper.ts
"
