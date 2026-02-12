#!/bin/bash
set -e

echo "Ticketer - Jelastic Setup"
echo "=========================="

# Check for .env file
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found. Create it with DATABASE_URL and other settings."
    exit 1
fi

echo "Step 1: Clean cache"
npm cache clean --force

echo "Step 2: Install all dependencies"
NODE_OPTIONS="--max-old-space-size=4096" npm ci

echo "Step 3: Generate Prisma client"
npm run db:generate

echo "Step 4: Push database schema"
npx prisma db push --accept-data-loss

echo "Step 5: Seed database"
npm run db:seed || echo "Seeding skipped"

echo "Step 6: Build application"
NODE_OPTIONS="--max-old-space-size=4096" npm run build


echo ""
echo "Setup complete! Start with: npm start"
echo "Reduce Node.js cloudlets from 32 to 8-16 to save costs"
