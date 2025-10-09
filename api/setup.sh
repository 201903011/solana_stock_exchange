#!/bin/bash

echo "🚀 Setting up Solana Stock Exchange API..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 16.x"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL is not installed. Please install MySQL >= 8.0"
    exit 1
fi

echo "✅ MySQL detected"

# Install dependencies
echo "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "${YELLOW}📝 Creating .env file...${NC}"
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "${YELLOW}📁 Creating directories...${NC}"
mkdir -p logs
mkdir -p uploads

# Database setup
echo "${YELLOW}💾 Setting up database...${NC}"
read -p "Do you want to setup the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter MySQL username (default: root): " DB_USER
    DB_USER=${DB_USER:-root}
    
    read -sp "Enter MySQL password: " DB_PASSWORD
    echo
    
    read -p "Enter database name (default: solana_stock_exchange): " DB_NAME
    DB_NAME=${DB_NAME:-solana_stock_exchange}
    
    # Create database
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Database created successfully"
        
        # Import schema
        mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/schema.sql 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ Database schema imported successfully"
        else
            echo "❌ Failed to import database schema"
        fi
    else
        echo "❌ Failed to create database"
    fi
fi

# Build TypeScript
echo "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Setup completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update the .env file with your configuration"
    echo "2. Ensure Solana programs are deployed"
    echo "3. Configure Razorpay credentials"
    echo "4. Run: npm run dev (for development)"
    echo "   or: npm start (for production)"
    echo ""
    echo "API will be available at: http://localhost:3000"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
