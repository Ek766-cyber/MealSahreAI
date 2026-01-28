#!/bin/bash

# Authentication Fix Setup Script
# This script helps you set up the authentication fix

echo "🔧 MealShare AI - Authentication Fix Setup"
echo "==========================================="
echo ""

# Check if connect-mongo is installed
if grep -q "connect-mongo" package.json; then
    echo "✅ connect-mongo is already installed"
else
    echo "📦 Installing connect-mongo..."
    npm install connect-mongo
fi

echo ""
echo "🔐 Generating secure session secret..."
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo ""
echo "Generated SESSION_SECRET:"
echo "$SESSION_SECRET"
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "📝 .env file found"
    
    # Check if SESSION_SECRET exists and is not commented
    if grep -q "^SESSION_SECRET=" .env; then
        echo "⚠️  SESSION_SECRET already exists in .env"
        read -p "Do you want to update it? (y/n): " UPDATE_SECRET
        if [ "$UPDATE_SECRET" = "y" ]; then
            # Replace existing SESSION_SECRET
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
            else
                sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
            fi
            echo "✅ SESSION_SECRET updated in .env"
        fi
    else
        echo "SESSION_SECRET=$SESSION_SECRET" >> .env
        echo "✅ SESSION_SECRET added to .env"
    fi
else
    echo "⚠️  .env file not found. Creating one..."
    cat > .env << EOF
# Session Configuration
SESSION_SECRET=$SESSION_SECRET

# MongoDB Connection
MONGODB_URI=your-mongodb-connection-string

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/.netlify/functions/server-cjs/auth/google/callback

# Client Configuration
CLIENT_URL=http://localhost:5173

# Node Environment
NODE_ENV=development
EOF
    echo "✅ .env file created"
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Update your .env file with actual values:"
echo "   - MONGODB_URI"
echo "   - GOOGLE_CLIENT_ID"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - CLIENT_URL (for production)"
echo ""
echo "2. In Netlify Dashboard, add these environment variables:"
echo "   - SESSION_SECRET=$SESSION_SECRET"
echo "   - MONGODB_URI=<your-mongodb-uri>"
echo "   - CLIENT_URL=<your-netlify-site-url>"
echo "   - GOOGLE_CALLBACK_URL=<your-netlify-site>/.netlify/functions/server-cjs/auth/google/callback"
echo "   - NODE_ENV=production"
echo ""
echo "3. Deploy your changes:"
echo "   git add ."
echo "   git commit -m 'Fix authentication with MongoDB session store'"
echo "   git push"
echo ""
echo "4. Test authentication after deployment"
echo ""
echo "📖 For more details, see AUTH_FIX.md"
echo ""
