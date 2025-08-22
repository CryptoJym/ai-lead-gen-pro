#!/bin/bash

# Vercel build script for AI Lead Gen Pro
echo "🚀 Building AI Lead Gen Pro for Vercel..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run build
echo "🔨 Building Next.js application..."
npm run build

# Verify static files
echo "✅ Verifying visualization files..."
ls -la public/docs/

echo "✨ Build complete!"