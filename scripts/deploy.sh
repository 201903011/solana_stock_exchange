#!/bin/bash

# Deploy script for Solana Stock Exchange

set -e

echo "=================================="
echo "Solana Stock Exchange Deployment"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check current cluster
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo -e "${YELLOW}Current cluster: $CLUSTER${NC}"
echo ""

# Confirm deployment
read -p "Are you sure you want to deploy to this cluster? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo -e "${YELLOW}Current balance: $BALANCE SOL${NC}"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo -e "${RED}Warning: Low balance. You may need at least 5 SOL for deployment${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}Building programs...${NC}"
anchor build

echo ""
echo -e "${YELLOW}Deploying programs...${NC}"
anchor deploy

echo ""
echo -e "${GREEN}✓ Deployment completed!${NC}"
echo ""

# Display deployed program IDs
echo "Deployed Program IDs:"
echo "===================="
solana program show $(solana-keygen pubkey target/deploy/exchange_core-keypair.json) 2>/dev/null | head -n 1 || echo "Exchange Core: Failed to fetch"
solana program show $(solana-keygen pubkey target/deploy/escrow-keypair.json) 2>/dev/null | head -n 1 || echo "Escrow: Failed to fetch"
solana program show $(solana-keygen pubkey target/deploy/governance-keypair.json) 2>/dev/null | head -n 1 || echo "Governance: Failed to fetch"
solana program show $(solana-keygen pubkey target/deploy/fee_management-keypair.json) 2>/dev/null | head -n 1 || echo "Fee Management: Failed to fetch"

echo ""
