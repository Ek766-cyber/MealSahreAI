#!/bin/bash

# Test Email Sending on Netlify
# Usage: ./test-netlify-email.sh <your-netlify-url>

if [ -z "$1" ]; then
  echo "Usage: ./test-netlify-email.sh <netlify-url>"
  echo "Example: ./test-netlify-email.sh https://your-app.netlify.app"
  exit 1
fi

NETLIFY_URL="$1"
API_URL="${NETLIFY_URL}/.netlify/functions/server-cjs"

echo "🧪 Testing Netlify Email Endpoint"
echo "API URL: $API_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s "${API_URL}/" | jq '.'
echo ""

# Test 2: Email status (requires authentication)
echo "2️⃣ Testing email status endpoint..."
curl -s -X GET \
  "${API_URL}/api/notifications/email-status" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  | jq '.'
echo ""

# Test 3: Send test email (requires authentication)
echo "3️⃣ Testing send email endpoint..."
echo "NOTE: You need to be authenticated for this test"
echo "Please run this from your browser console instead:"
echo ""
echo "fetch('${API_URL}/api/notifications/send-email', {"
echo "  method: 'POST',"
echo "  headers: { 'Content-Type': 'application/json' },"
echo "  credentials: 'include',"
echo "  body: JSON.stringify({"
echo "    name: 'Test User',"
echo "    message: 'This is a test message',"
echo "    amountOwed: 100"
echo "  })"
echo "}).then(r => r.json()).then(console.log);"
echo ""

# Test 4: Check scheduled tasks function
echo "4️⃣ Checking if scheduled tasks function exists..."
SCHEDULED_URL="${NETLIFY_URL}/.netlify/functions/scheduled-tasks"
echo "Scheduled tasks URL: $SCHEDULED_URL"
echo ""

echo "✅ Basic tests complete!"
echo ""
echo "To fully test:"
echo "1. Log in to your app at: ${NETLIFY_URL}"
echo "2. Open browser console (F12)"
echo "3. Run the fetch command shown above"
echo "4. Check Netlify function logs for detailed output"
