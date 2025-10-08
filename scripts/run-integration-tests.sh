#!/bin/bash

# =============================================================================
# Solana Stock Exchange - Integration Test Runner
# =============================================================================
# This script runs comprehensive integration tests for the entire exchange
# workflow including: onboarding, listing, trading, settlement, and withdrawal
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print banner
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║           🚀 SOLANA STOCK EXCHANGE - INTEGRATION TESTS 🚀                 ║"
echo "║                                                                            ║"
echo "║                    Comprehensive Workflow Testing                          ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Check if solana-test-validator is running
echo -e "${YELLOW}🔍 Checking if Solana test validator is running...${NC}"
if ! pgrep -x "solana-test-val" > /dev/null; then
    echo -e "${YELLOW}⚠️  Solana test validator is not running${NC}"
    echo -e "${BLUE}📝 Starting Solana test validator...${NC}"
    solana-test-validator --reset &
    VALIDATOR_PID=$!
    echo -e "${GREEN}✅ Validator started with PID: $VALIDATOR_PID${NC}"
    echo -e "${BLUE}⏳ Waiting for validator to be ready...${NC}"
    sleep 10
else
    echo -e "${GREEN}✅ Solana test validator is already running${NC}"
fi

# Set Solana config to localhost
echo -e "\n${BLUE}🔧 Configuring Solana CLI for localhost...${NC}"
solana config set --url http://localhost:8899
echo -e "${GREEN}✅ Solana CLI configured${NC}"

# Build programs
echo -e "\n${BLUE}🔨 Building Anchor programs...${NC}"
anchor build
echo -e "${GREEN}✅ Programs built successfully${NC}"

# Deploy programs
echo -e "\n${BLUE}🚀 Deploying programs to localnet...${NC}"
anchor deploy
echo -e "${GREEN}✅ Programs deployed successfully${NC}"

# Get program IDs
echo -e "\n${PURPLE}📋 Program IDs:${NC}"
echo -e "${CYAN}Exchange Core:${NC} $(solana address -k target/deploy/exchange_core-keypair.json)"
echo -e "${CYAN}Escrow:${NC} $(solana address -k target/deploy/escrow-keypair.json)"
echo -e "${CYAN}Fee Management:${NC} $(solana address -k target/deploy/fee_management-keypair.json)"
echo -e "${CYAN}Governance:${NC} $(solana address -k target/deploy/governance-keypair.json)"

# Run tests
echo -e "\n${BLUE}🧪 Running integration tests...${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════════════════${NC}\n"

anchor test --skip-local-validator --skip-build --skip-deploy

# Check test result
TEST_EXIT_CODE=$?

echo -e "\n${YELLOW}════════════════════════════════════════════════════════════════════════════${NC}\n"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                            ║"
    echo "║                     ✅ ALL TESTS PASSED! ✅                                ║"
    echo "║                                                                            ║"
    echo "║              All blockchain functionality verified successfully            ║"
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    echo -e "${CYAN}🔍 Next Steps:${NC}"
    echo -e "  1. Check Solana Explorer at: ${BLUE}https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899${NC}"
    echo -e "  2. View account states using addresses printed above"
    echo -e "  3. Verify transactions on the blockchain"
    echo -e "  4. Check program logs: ${YELLOW}solana logs${NC}\n"
else
    echo -e "${RED}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                            ║"
    echo "║                     ❌ TESTS FAILED! ❌                                    ║"
    echo "║                                                                            ║"
    echo "║                  Please check the error messages above                     ║"
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    echo -e "${YELLOW}🔍 Debugging tips:${NC}"
    echo -e "  1. Check program logs: ${BLUE}solana logs${NC}"
    echo -e "  2. Verify program IDs in Anchor.toml match deployed programs"
    echo -e "  3. Ensure test validator has enough SOL"
    echo -e "  4. Check for any build errors above\n"
fi

# Optionally keep validator running
echo -e "${YELLOW}💡 Tip: Test validator is still running for manual testing${NC}"
echo -e "${YELLOW}   To stop: ${BLUE}pkill solana-test-val${NC}\n"

exit $TEST_EXIT_CODE
