#!/bin/bash

# MealShare AI - Environment Setup Script
# This script helps you set up your local development environment

set -e

echo "🍽️  MealShare AI - Environment Setup"
echo "===================================="
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local already exists"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "ℹ️  Keeping existing .env.local file"
        echo "✅ Setup complete!"
        exit 0
    fi
fi

# Copy from .env.example
if [ ! -f ".env.example" ]; then
    echo "❌ Error: .env.example not found!"
    exit 1
fi

echo "📋 Copying .env.example to .env.local..."
cp .env.example .env.local

echo ""
echo "✅ Created .env.local file"
echo ""
echo "⚙️  Configuration Required:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please edit .env.local and configure the following:"
echo ""
echo "1️⃣  VITE_API_URL (already set to http://localhost:5000 for local dev)"
echo "2️⃣  MONGODB_URI - Your MongoDB connection string"
echo "3️⃣  GOOGLE_CLIENT_ID - From Google Cloud Console"
echo "4️⃣  GOOGLE_CLIENT_SECRET - From Google Cloud Console"
echo "5️⃣  GEMINI_API_KEY - Your Gemini API key"
echo "6️⃣  EMAIL_USER - Your Gmail address"
echo "7️⃣  EMAIL_PASSWORD - Gmail App Password"
echo "8️⃣  SESSION_SECRET - Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - ENVIRONMENT_CONFIG.md"
echo "   - EMAIL_AND_DB_SETUP.md"
echo "   - SETUP_GUIDE.md"
echo ""
echo "🚀 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Edit .env.local with your credentials"
echo "2. Run: yarn install"
echo "3. Run: yarn server  (in one terminal)"
echo "4. Run: yarn dev     (in another terminal)"
echo "5. Open: http://localhost:3001"
echo ""
echo "✅ Setup script complete!"
