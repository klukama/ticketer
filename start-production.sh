#!/bin/bash
# Production startup script for Infomaniak Public Cloud deployment
# This script prepares and starts the application

set -e

echo "=========================================="
echo "Ticketer - Production Startup"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create a .env file with your Infomaniak database credentials."
    echo "You can use .env.production.example as a template:"
    echo "  cp .env.production.example .env"
    echo ""
    exit 1
fi

# Source environment variables
set -a
source .env
set +a

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set in .env"
    exit 1
fi

echo "✅ Environment configuration loaded"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npm run db:generate

echo ""
echo "🗄️  Setting up database schema..."
npm run db:push

echo ""
echo "🌱 Seeding database (if needed)..."
npm run db:seed || echo "⚠️  Seeding skipped (already seeded or failed)"

echo ""
echo "🚀 Starting application in production mode..."
echo "=========================================="
echo ""

# Start the application
exec npm start
