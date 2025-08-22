#!/bin/bash

# Vercel build optimization script
echo "🚀 Starting optimized build for Vercel..."

# Skip chromium download for Playwright (not needed for build)
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Skip puppeteer chromium download
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_SKIP_DOWNLOAD=true

# Use npm ci for faster, more reliable installs
echo "📦 Installing dependencies with npm ci..."
npm ci --only=production --no-audit --no-fund

# Install dev dependencies needed for build
echo "📦 Installing build dependencies..."
npm install --no-save --no-audit --no-fund \
  typescript \
  @types/react \
  @types/node \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint \
  eslint-config-next

# Run the build
echo "🔨 Building Next.js application..."
npm run build

echo "✨ Build complete!"