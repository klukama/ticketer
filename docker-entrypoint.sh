#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
node prisma/seed.js || echo "Seeding failed or already seeded, continuing..."

echo "Starting application..."
exec node server.js
