#!/bin/bash

# Solana Stock Exchange Build Script
# This script builds all programs in the workspace

set -e  # Exit on error

echo "=================================="
echo "Solana Stock Exchange Build Script"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${RED}Error: Anchor CLI not found${NC}"
    echo "Please install Anchor: https://book.anchor-lang.com/getting_started/installation.html"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI not found${NC}"
    echo "Please install Solana: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

echo -e "${YELLOW}Checking Anchor version...${NC}"
anchor --version

echo -e "${YELLOW}Checking Solana version...${NC}"
solana --version

echo ""
echo -e "${YELLOW}Cleaning previous build artifacts...${NC}"
anchor clean

echo ""
echo -e "${YELLOW}Building all programs...${NC}"
anchor build

echo ""
echo -e "${GREEN}✓ Build completed successfully!${NC}"
echo ""

# Display program IDs
echo "Program IDs:"
echo "============"
if [ -f "target/deploy/exchange_core-keypair.json" ]; then
    EXCHANGE_CORE_ID=$(solana-keygen pubkey target/deploy/exchange_core-keypair.json)
    echo "Exchange Core:    $EXCHANGE_CORE_ID"
fi

if [ -f "target/deploy/escrow-keypair.json" ]; then
    ESCROW_ID=$(solana-keygen pubkey target/deploy/escrow-keypair.json)
    echo "Escrow:           $ESCROW_ID"
fi

if [ -f "target/deploy/governance-keypair.json" ]; then
    GOVERNANCE_ID=$(solana-keygen pubkey target/deploy/governance-keypair.json)
    echo "Governance:       $GOVERNANCE_ID"
fi

if [ -f "target/deploy/fee_management-keypair.json" ]; then
    FEE_MGMT_ID=$(solana-keygen pubkey target/deploy/fee_management-keypair.json)
    echo "Fee Management:   $FEE_MGMT_ID"
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Update program IDs in Anchor.toml"
echo "2. Update declare_id! macros in each program's lib.rs"
echo "3. Rebuild: anchor build"
echo "4. Run tests: anchor test"
echo "5. Deploy: anchor deploy"
echo ""
