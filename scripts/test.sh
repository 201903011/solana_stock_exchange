#!/bin/bash

# Test script for Solana Stock Exchange

set -e

echo "=================================="
echo "Running Solana Stock Exchange Tests"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    yarn install
fi

echo -e "${YELLOW}Building programs...${NC}"
anchor build

echo ""
echo -e "${YELLOW}Running tests...${NC}"
anchor test

echo ""
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
