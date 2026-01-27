#!/bin/bash

# Test Server-Side Schedulers
# This script tests the auto-sync and auto-send features

echo "🧪 Testing Server-Side Schedulers"
echo "=================================="
echo ""

# Check if server is running
echo "1️⃣ Checking if server is running..."
curl -s http://localhost:5000/health > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running. Start it with: yarn server"
    exit 1
fi

echo ""
echo "2️⃣ Login to get session cookie..."
echo "   ⚠️  You need to login first in the browser: http://localhost:3002"
echo "   Press Enter when you've logged in..."
read

echo ""
echo "3️⃣ Triggering manual sync..."
SYNC_RESPONSE=$(curl -s -X POST http://localhost:5000/api/sheet/trigger-manual-sync \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt)

echo "   Response: $SYNC_RESPONSE"
echo "   ⏳ Waiting 5 seconds for sync to complete..."
sleep 5

echo ""
echo "4️⃣ Triggering manual notification..."
NOTIFY_RESPONSE=$(curl -s -X POST http://localhost:5000/api/notifications/trigger-manual-run \
  -H "Content-Type: application/json" \
  --cookie cookies.txt)

echo "   Response: $NOTIFY_RESPONSE"
echo "   ⏳ Waiting 5 seconds for notifications to process..."
sleep 5

echo ""
echo "5️⃣ Check server logs above for detailed output:"
echo "   - Look for '🔄 Running scheduled sync task'"
echo "   - Look for '🔔 Running scheduled notification task'"
echo "   - Look for '📧 Sending email to...'"
echo ""
echo "✅ Test complete! Check the server terminal for detailed logs."
echo ""
echo "📊 To check scheduler status:"
echo "   curl -X GET http://localhost:5000/api/notifications/scheduler-status --cookie cookies.txt"
