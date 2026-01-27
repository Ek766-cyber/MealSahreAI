# 🔧 Scheduler Troubleshooting Guide

## Issue: Schedulers Not Working When Browser is Closed

### Root Cause Found ✅

The notification scheduler was trying to fetch data using **Google Sheets API with service accounts**, which wasn't configured. Instead, it should use the **synced data from the database** that was fetched via the user's CSV URL.

### The Fix

**Changed `server/services/schedulerService.ts`:**

**Before (❌ Broken):**

```typescript
// Tried to fetch directly from Google Sheets API
const balances = await this.fetchBalancesFromSheet();
// This required GOOGLE_SERVICE_ACCOUNT_KEY which wasn't set
```

**After (✅ Fixed):**

```typescript
// Use synced data from database
const syncedPeople = user.syncedPeople || [];
// Calculate balances from already-synced data
```

---

## How It Works Now

### Step 1: Auto-Sync Runs First

```
🕐 At scheduled time (e.g., 04:26 AM)
├─ Sync scheduler triggers
├─ Fetches CSV from user's Google Sheets URL
├─ Parses the data
├─ Saves to database: user.syncedPeople
└─ ✅ Data ready for notifications
```

### Step 2: Auto-Send Runs After

```
🕐 At scheduled time (e.g., 04:27 AM)
├─ Notification scheduler triggers
├─ Reads user.syncedPeople from database ✅
├─ Calculates balances
├─ Generates AI reminders
├─ Sends emails
└─ ✅ Notifications sent!
```

### ⚠️ Important: Sync Must Run First!

For notifications to work:

1. ✅ **Auto-sync must be enabled**
2. ✅ **CSV URL must be configured**
3. ✅ **Sync must run at least once** to populate database
4. ✅ **Notification time should be AFTER sync time**

**Recommended Setup:**

- Sync time: **04:26** (or any time)
- Notification time: **04:27** (1 minute after sync)

---

## Testing Steps

### Prerequisites

1. **Start the server:**

   ```bash
   yarn server
   ```

2. **Start the frontend:**

   ```bash
   yarn dev
   ```

3. **Login to the app:**
   - Open: http://localhost:3002 (or 3001)
   - Click "Sign in with Google"
   - Complete authentication

### Test Auto-Sync

1. **Configure in UI:**
   - Go to "Data Entry" tab
   - Add your Google Sheets CSV URL
   - Enable "Auto-Fetch Scheduler"
   - Set sync time
   - ✅ Save (auto-saves)

2. **Trigger manually for testing:**
   - Click "Test Now" button in the UI

   **OR** use the terminal:

   ```bash
   # Login first in browser, then:
   ./test-schedulers.sh
   ```

3. **Check server logs:**
   ```
   🔄 Running scheduled sync task...
   📋 CSV URL: https://docs.google.com/...
   📥 Fetching data from Google Sheets...
   ✅ Auto-sync complete:
      📊 People synced: 6
      💰 Meal rate: $59
      ⏰ Last sync: 1/28/2026, 4:26:00 AM
   ```

### Test Auto-Send Notifications

1. **First, ensure sync has run!** (Data must be in database)

2. **Configure in UI:**
   - Go to "Notification Center" tab
   - Set scheduled time (should be AFTER sync time)
   - Enable "Auto-Send via Email"
   - Enable "Enable Email Notifications"
   - Turn "AUTO ON"
   - ✅ Save (auto-saves)

3. **Trigger manually for testing:**
   - Click "Generate Reminders" button
   - Then click "Send" for individual emails

   **OR** trigger the full automated flow:

   ```bash
   # In browser console or terminal:
   curl -X POST http://localhost:5000/api/notifications/trigger-manual-run \
     --cookie cookies.txt
   ```

4. **Check server logs:**

   ```
   🔔 Running scheduled notification task...
   📊 Fetching balances for emon122734@gmail.com...
   ✅ Found 6 people in synced data
   💰 Meal rate: $59.00
   🤖 Generating reminders with threshold: $100, tone: friendly
   📝 Generated 3 reminders
   📧 Sending email to Sayem (sayem@example.com)...
   ✅ Email sent to Sayem
   📧 Sending email to Golam (golam@example.com)...
   ✅ Email sent to Golam

   📊 Scheduled task complete:
      ✅ Sent: 2
      ❌ Failed: 0
      📋 Total: 2
   ```

---

## Verification Checklist

Use this checklist to ensure everything is set up correctly:

### Backend Server

- [ ] ✅ Server is running (`yarn server`)
- [ ] ✅ MongoDB connected successfully
- [ ] ✅ Schedulers initialized on startup
- [ ] ✅ Logs show: "Notification scheduler started for user..."
- [ ] ✅ Logs show: "Sync scheduler started for user..."

### Database Configuration

- [ ] ✅ User has `csvUrl` set
- [ ] ✅ User has `autoSyncEnabled: true`
- [ ] ✅ User has `notificationConfig.autoSend: true`
- [ ] ✅ User has `notificationConfig.emailEnabled: true`
- [ ] ✅ User has `notificationConfig.isEnabled: true`

### Data Requirements

- [ ] ✅ User has `syncedPeople` array in database (populated by sync)
- [ ] ✅ `syncedPeople` contains meal and contribution data
- [ ] ✅ Members have email addresses in Member collection

### Timing Configuration

- [ ] ✅ Sync time is BEFORE notification time
- [ ] ✅ At least 1 minute gap between sync and notification
- [ ] ✅ Times are in 24-hour format (e.g., "04:26")

---

## Common Issues & Solutions

### Issue 1: "No synced data found"

**Error in logs:**

```
⚠️ No synced data found for user@example.com. Run sync first.
```

**Solution:**

1. Enable auto-sync in Data Entry tab
2. Add CSV URL
3. Click "Test Now" to run sync manually
4. Verify data is saved: check "Current Data" section shows people

### Issue 2: "No email found for member"

**Error in logs:**

```
⚠️ No email found for Sayem
```

**Solution:**

1. Go to "Member Manager" tab
2. Add email addresses for all members
3. Make sure names match exactly (case-insensitive)

### Issue 3: Schedulers not starting

**Error in logs:**

```
📋 Found 0 users with auto-send enabled
```

**Solution:**

1. Check all configuration flags are enabled (see checklist above)
2. Restart the server: `pkill -f "tsx server" && yarn server`
3. Verify config is saved in database

### Issue 4: Wrong time zone

**Symptoms:** Scheduler runs at wrong time

**Solution:**
Edit `server/services/schedulerService.ts`:

```typescript
const task = cron.schedule(
  cronExpression,
  async () => {
    // ...
  },
  {
    scheduled: true,
    timezone: "Asia/Dhaka", // Change to your timezone
  },
);
```

Common timezones:

- `'America/New_York'` - US Eastern
- `'America/Los_Angeles'` - US Pacific
- `'Europe/London'` - UK
- `'Asia/Dhaka'` - Bangladesh
- `'Asia/Kolkata'` - India

---

## Debug Commands

### Check if schedulers are running:

```bash
curl -X GET http://localhost:5000/api/notifications/scheduler-status \
  --cookie cookies.txt
```

### Manually trigger sync:

```bash
curl -X POST http://localhost:5000/api/sheet/trigger-manual-sync \
  --cookie cookies.txt
```

### Manually trigger notification:

```bash
curl -X POST http://localhost:5000/api/notifications/trigger-manual-run \
  --cookie cookies.txt
```

### Check MongoDB data:

```javascript
// In MongoDB Compass or shell:
db.users.findOne(
  { email: "your@email.com" },
  {
    syncedPeople: 1,
    autoSyncEnabled: 1,
    notificationConfig: 1,
    csvUrl: 1,
  },
);
```

---

## Expected Behavior

### When Browser is Open:

- ✅ UI updates in real-time
- ✅ Can manually trigger sync/notifications
- ✅ Schedulers still run on server (independent of browser)

### When Browser is Closed:

- ✅ Server keeps running
- ✅ Schedulers run at scheduled times
- ✅ Emails are sent automatically
- ✅ Data is synced automatically
- ✅ Everything works without any browser interaction!

---

## Production Deployment Notes

### Keep Server Running 24/7

**Option 1: PM2 (Recommended)**

```bash
pm2 start server/server.ts --name mealshare-api
pm2 startup  # Enable auto-start on reboot
pm2 save
```

**Option 2: Systemd Service**

```bash
sudo systemctl enable mealshare-api
sudo systemctl start mealshare-api
```

**Option 3: Docker Container**

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN yarn install && yarn build
CMD ["yarn", "server"]
```

### Monitor Logs

```bash
# PM2
pm2 logs mealshare-api

# Systemd
sudo journalctl -u mealshare-api -f

# Docker
docker logs -f mealshare-api
```

---

## Success Indicators

You'll know it's working when you see:

1. **Server starts:**

   ```
   ✅ MongoDB Connected Successfully
   🕐 Initializing notification and sync schedulers...
   📋 Found 1 users with auto-send enabled
   ✅ Notification scheduler started for user...
   📋 Found 1 users with auto-sync enabled
   ✅ Sync scheduler started for user...
   ```

2. **Sync runs:**

   ```
   🔄 Running scheduled sync task...
   ✅ Auto-sync complete: 📊 People synced: 6
   ```

3. **Notifications run:**

   ```
   🔔 Running scheduled notification task...
   📧 Sending email to...
   ✅ Email sent to...
   ```

4. **Browser can be closed** - and it all still works!

---

**Last Updated:** January 28, 2026  
**Issue:** Fixed notification scheduler to use synced data from database instead of Google Sheets API
