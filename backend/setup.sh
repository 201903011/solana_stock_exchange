#!/bin/bash

# Solana Stock Exchange Backend - Quick Start Script

echo "🚀 Solana Stock Exchange Backend Setup"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL not found in PATH. Make sure MySQL is installed and accessible."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
    echo ""
    echo "⚠️  IMPORTANT: Update the following in .env:"
    echo "   - DB_PASSWORD"
    echo "   - JWT_SECRET (use a strong random string)"
    echo "   - RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
    echo "   - SOLANA_RPC_URL (if not using local)"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p uploads logs
echo "✅ Directories created"
echo ""

# Database setup instructions
echo "🗄️  Database Setup:"
echo "   1. Create MySQL database: CREATE DATABASE solana_stock_exchange;"
echo "   2. Run schema: mysql -u root -p solana_stock_exchange < database/schema.sql"
echo "   3. Default admin credentials:"
echo "      Email: admin@stockexchange.com"
echo "      Password: admin123"
echo ""

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Configure .env file with your settings"
echo "   2. Set up MySQL database (see instructions above)"
echo "   3. Run: npm run dev (for development)"
echo "   4. Run: npm run build && npm start (for production)"
echo ""
echo "📚 Documentation:"
echo "   - README.md - General documentation"
echo "   - PROJECT_SUMMARY.md - Complete design overview"
echo "   - IMPLEMENTATION_GUIDE.md - Controller implementation details"
echo ""
echo "🌐 Server will run on:"
echo "   - API: http://localhost:4000"
echo "   - WebSocket: ws://localhost:4001"
echo ""
echo "Happy coding! 🎉"
