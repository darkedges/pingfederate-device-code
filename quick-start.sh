#!/bin/bash

# Quick Start Script for Device Authorization Grant & CIBA Demo
# This script sets up and starts both applications

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Device Auth & CIBA Demo - Quick Start                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found:${NC} $(node -v)"
echo -e "${GREEN}✓ npm found:${NC} $(npm -v)"
echo ""

# Step 1: Install dependencies
echo -e "${YELLOW}→ Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}→ Creating .env file from example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo "  Edit .env to configure Ping Federate URL and credentials"
    echo ""
fi

# Step 3: Display next steps
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  Next Steps                                            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "1. Edit .env file with your configuration:"
echo "   nano .env"
echo ""
echo "2. Start both applications:"
echo "   npm run dev"
echo ""
echo "3. Open in browser:"
echo "   TV App:       http://localhost:3000"
echo "   Identity App: http://localhost:3001"
echo ""
echo "4. Default credentials for Identity App:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "For more information, see README.md"
