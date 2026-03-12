#!/bin/sh
set -e

# Run DB migration
npx tsx lib/db/migrate.ts

# Find the standalone server.js (path varies by build environment)
STANDALONE_DIR=$(find .next/standalone -name "server.js" -not -path "*/node_modules/*" -exec dirname {} \; | head -1)

if [ -z "$STANDALONE_DIR" ]; then
  echo "Error: standalone server.js not found"
  exit 1
fi

# Copy static assets into standalone (rm first to avoid nested copy)
rm -rf "$STANDALONE_DIR/.next/static"
cp -r .next/static "$STANDALONE_DIR/.next/static"
mkdir -p "$STANDALONE_DIR/public"
cp -r public/* "$STANDALONE_DIR/public/" 2>/dev/null || true

# Ensure data directory exists and link DB
mkdir -p "$STANDALONE_DIR/data"
ln -sf /app/data/vta.db "$STANDALONE_DIR/data/vta.db" 2>/dev/null || true

# Screenshots on persistent volume — symlink so both bot and web server use the same path
mkdir -p /app/data/screenshots
rm -rf /app/public/screenshots
ln -sf /app/data/screenshots /app/public/screenshots
rm -rf "$STANDALONE_DIR/public/screenshots"
ln -sf /app/data/screenshots "$STANDALONE_DIR/public/screenshots"

# Start bot in background
npx tsx bot/index.ts &

# Start Next.js standalone server
PORT=3000 HOSTNAME=0.0.0.0 node "$STANDALONE_DIR/server.js"
