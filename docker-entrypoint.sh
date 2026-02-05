#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --skip-generate

echo "Seeding database..."
npm run db:seed || echo "Seeding failed or already seeded, continuing..."

echo "Starting application..."
exec node server.js
