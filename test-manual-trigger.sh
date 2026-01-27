#!/bin/bash

echo "🧪 Testing Manual Sync and Notification"
echo "========================================"
echo ""

echo "📍 Current time: $(date +"%H:%M:%S")"
echo ""

echo "🔄 Step 1: Triggering manual SYNC..."
echo "   (This fetches data from Google Sheets)"
echo ""

# Make sure you're logged in first by visiting http://localhost:3002
# The session cookie will be used

SYNC_RESULT=$(curl -s -X POST http://localhost:5000/api/sheet/trigger-manual-sync \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=$(cat ~/.mealshare_session 2>/dev/null || echo '')" \
  --cookie-jar /tmp/cookies.txt \
  --cookie /tmp/cookies.txt 2>&1)

echo "Response: $SYNC_RESULT"
echo ""
echo "⏳ Waiting 8 seconds for sync to complete..."
sleep 8
echo ""

echo "📧 Step 2: Triggering manual NOTIFICATION..."
echo "   (This generates reminders and sends emails)"
echo ""

NOTIFY_RESULT=$(curl -s -X POST http://localhost:5000/api/notifications/trigger-manual-run \
  -H "Content-Type: application/json" \
  --cookie /tmp/cookies.txt 2>&1)

echo "Response: $NOTIFY_RESULT"
echo ""
echo "⏳ Waiting 5 seconds for emails to send..."
sleep 5
echo ""

echo "✅ Manual triggers sent!"
echo ""
echo "📊 Check the SERVER TERMINAL for detailed logs:"
echo "   Look for: '🔄 Running scheduled sync task'"
echo "   Look for: '🔔 Running scheduled notification task'"
echo "   Look for: '📧 Sending email to...'"
echo "   Look for: '✅ Email sent successfully'"
echo ""
echo "⚠️  If you see authentication errors:"
echo "   1. Open http://localhost:3002 in browser"
echo "   2. Login with Google"
echo "   3. Run this script again"
