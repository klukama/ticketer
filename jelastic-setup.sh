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

echo "Step 2: Install production dependencies"
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev

echo "Step 3: Install build dependencies"
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma

echo "Step 4: Generate Prisma client"
npm run db:generate

echo "Step 5: Push database schema"
npx prisma db push --accept-data-loss

echo "Step 6: Seed database"
npm run db:seed || echo "Seeding skipped"

echo "Step 7: Build application"
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "Step 8: Clean up dev dependencies"
npm prune --production

echo ""
echo "Setup complete! Start with: npm start"
echo "Reduce Node.js cloudlets from 32 to 8-16 to save costs"
