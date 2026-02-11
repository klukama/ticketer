#!/bin/bash

# Validation script for Jelastic deployment configuration
# This script validates the deployment setup without actually deploying

set -e

echo "================================================"
echo "Ticketer - Jelastic Configuration Validator"
echo "================================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"
REQUIRED_NODE_MAJOR=18
CURRENT_NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$CURRENT_NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
    echo -e "${RED}✗ Node.js version is too old. Minimum required: v${REQUIRED_NODE_MAJOR}${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ Node.js version is compatible${NC}"
fi
echo ""

# Check npm
echo "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm version: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm is not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check required files
echo "Checking required files..."
FILES=(
    "package.json"
    "Dockerfile"
    "nginx.conf"
    "JELASTIC_DEPLOYMENT.md"
    "jelastic-setup.sh"
    ".env.jelastic"
    "prisma/schema.prisma"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file exists${NC}"
    else
        echo -e "${RED}✗ $file is missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check Dockerfile for correct Node.js version
echo "Checking Dockerfile configuration..."
if grep -q "FROM node:25-alpine" Dockerfile; then
    echo -e "${GREEN}✓ Dockerfile uses Node.js 25 (compatible with 25.6.0)${NC}"
else
    echo -e "${YELLOW}⚠ Dockerfile does not use Node.js 25${NC}"
fi
echo ""

# Check Prisma schema for MySQL
echo "Checking Prisma schema..."
if grep -q 'provider = "mysql"' prisma/schema.prisma; then
    echo -e "${GREEN}✓ Prisma schema configured for MySQL${NC}"
else
    echo -e "${RED}✗ Prisma schema not configured for MySQL${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check nginx.conf syntax (basic check)
echo "Checking nginx.conf..."
if [ -f "nginx.conf" ]; then
    if grep -q "upstream nodejs_backend" nginx.conf; then
        echo -e "${GREEN}✓ nginx.conf has upstream configuration${NC}"
    else
        echo -e "${RED}✗ nginx.conf missing upstream configuration${NC}"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "proxy_pass http://nodejs_backend" nginx.conf; then
        echo -e "${GREEN}✓ nginx.conf has proxy_pass configuration${NC}"
    else
        echo -e "${RED}✗ nginx.conf missing proxy_pass configuration${NC}"
        ERRORS=$((ERRORS + 1))
    fi
fi
echo ""

# Check jelastic-setup.sh is executable
echo "Checking setup script..."
if [ -x "jelastic-setup.sh" ]; then
    echo -e "${GREEN}✓ jelastic-setup.sh is executable${NC}"
else
    echo -e "${YELLOW}⚠ jelastic-setup.sh is not executable (run: chmod +x jelastic-setup.sh)${NC}"
fi
echo ""

# Check environment template
echo "Checking environment configuration..."
if [ -f ".env.jelastic" ]; then
    if grep -q "DATABASE_URL" .env.jelastic; then
        echo -e "${GREEN}✓ .env.jelastic has DATABASE_URL${NC}"
    else
        echo -e "${RED}✗ .env.jelastic missing DATABASE_URL${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ .env.jelastic template is missing${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Configuration is ready for Jelastic deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review JELASTIC_DEPLOYMENT.md for deployment instructions"
    echo "2. Create your Jelastic environment"
    echo "3. Configure database credentials"
    echo "4. Run jelastic-setup.sh on the Node.js server"
    echo "5. Configure nginx with nginx.conf"
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo -e "${RED}Please fix the errors before deploying${NC}"
    exit 1
fi
echo "================================================"
