#!/bin/bash

# Jelastic Deployment Setup Script
# This script helps set up the Ticketer application on Jelastic Cloud
# Run this script on the Node.js application server after initial deployment

set -e

echo "================================================"
echo "Ticketer - Jelastic Cloud Setup Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on Node.js environment
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Node.js version: $(node --version)${NC}"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}npm version: $(npm --version)${NC}"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.jelastic template..."
    
    if [ -f ".env.jelastic" ]; then
        cp .env.jelastic .env
        echo -e "${GREEN}.env file created from template${NC}"
        echo -e "${RED}IMPORTANT: Edit .env file with your actual database credentials!${NC}"
    else
        echo -e "${RED}Error: .env.jelastic template not found${NC}"
        exit 1
    fi
fi

echo ""
echo "================================================"
echo "Step 1: Installing dependencies..."
echo "================================================"
npm ci

echo ""
echo "================================================"
echo "Step 2: Generating Prisma Client..."
echo "================================================"
npm run db:generate

echo ""
echo "================================================"
echo "Step 3: Pushing database schema..."
echo "================================================"
echo -e "${YELLOW}Make sure your database is accessible and credentials in .env are correct${NC}"
read -p "Press Enter to continue or Ctrl+C to abort..."
npm run db:push

echo ""
echo "================================================"
echo "Step 4: Seeding database..."
echo "================================================"
npm run db:seed || echo -e "${YELLOW}Seeding failed or database already seeded${NC}"

echo ""
echo "================================================"
echo "Step 5: Building application..."
echo "================================================"
npm run build

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Verify .env file has correct database credentials"
echo "2. Start the application with: npm start"
echo "3. Configure Nginx load balancer to point to this server"
echo "4. Access your application via the Jelastic environment URL"
echo ""
echo "For detailed deployment instructions, see JELASTIC_DEPLOYMENT.md"
echo ""
