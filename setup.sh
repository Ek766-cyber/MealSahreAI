#!/bin/bash

# MealShare AI Quick Start Script
echo "🚀 Starting MealShare AI Setup..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running!"
    echo "Please start MongoDB first:"
    echo "  - Ubuntu/Debian: sudo systemctl start mongodb"
    echo "  - macOS: brew services start mongodb-community"
    exit 1
fi

echo "✅ MongoDB is running"

# Check if .env file exists and has required variables
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Please create .env file and add your configuration"
    exit 1
fi

if ! grep -q "GOOGLE_CLIENT_ID=your-google-client-id-here" .env 2>/dev/null; then
    echo "✅ Google OAuth credentials configured"
else
    echo "⚠️  Please update Google OAuth credentials in .env file"
    echo "See SETUP_GUIDE.md for instructions"
    exit 1
fi

echo ""
echo "📦 Installing dependencies..."
yarn install

echo ""
echo "🎯 Setup complete!"
echo ""
echo "To start the application:"
echo "  Terminal 1: yarn server    (Backend on port 5000)"
echo "  Terminal 2: yarn dev       (Frontend on port 5173)"
echo ""
echo "📖 See SETUP_GUIDE.md for detailed instructions"
