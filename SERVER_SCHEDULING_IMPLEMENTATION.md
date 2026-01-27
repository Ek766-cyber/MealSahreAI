# 🔄 Server-Side Scheduling Implementation

## Problem Solved

**Issue:** Auto-send emails and auto-sync features stopped working when all browser tabs were closed because the scheduling logic was running in the frontend (client-side JavaScript).

**Solution:** Moved all scheduling logic to the **backend server**, which runs independently of the browser. Now schedulers work 24/7 even when no browser tabs are open!

---

## ✅ Changes Made

### 1. Frontend Changes

#### `components/NotificationCenter.tsx`

- ✅ **Removed** client-side scheduler (`useEffect` with interval checking)
- ✅ **Removed** `runScheduledTask()` function
- ✅ **Added** clear messaging: "runs on server, no tab needed"
- ✅ Configuration still works - saves to database and triggers backend scheduler

**Before:**

```typescript
// Client-side scheduling (stopped when browser closed)
useEffect(() => {
  const interval = setInterval(() => {
    if (currentTime === scheduledTime) {
      runScheduledTask(); // Only runs if tab is open!
    }
  }, 5000);
}, [isEnabled, scheduledTime]);
```

**After:**

```typescript
// Server handles all scheduling automatically
// Configuration is saved to database and triggers backend scheduler
```

#### `components/DataEntry.tsx`

- ✅ Already had server-side messaging
- ✅ "Test Now" button triggers server-side sync
- ✅ Refresh button gets latest data from server

### 2. Backend Implementation (Already in Place)

#### `server/services/schedulerService.ts`

- ✅ **Node-cron schedulers** run independently on the server
- ✅ **Notification scheduler**: Sends emails at configured time
- ✅ **Sync scheduler**: Fetches Google Sheets data at configured time
- ✅ **Persistent**: Runs 24/7 as long as server is up
- ✅ **Per-user scheduling**: Each user has their own schedule

#### `server/routes/notifications.ts`

- ✅ `/config` - Save notification settings
- ✅ Automatically **starts/stops schedulers** when config changes
- ✅ `/trigger-manual-run` - Test notification scheduler
- ✅ `/scheduler-status` - Check active schedulers

#### `server/routes/sheet.ts`

- ✅ `/save-scheduler` - Save auto-sync settings
- ✅ Automatically **starts/stops sync scheduler** when config changes
- ✅ `/trigger-manual-sync` - Test sync scheduler

---

## 🎯 How It Works Now

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  (Browser - Can be closed anytime)                      │
│                                                          │
│  1. Configure schedule time                             │
│  2. Enable auto-send / auto-sync                        │
│  3. Save configuration                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP POST /config
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND SERVER                          │
│  (Runs continuously on http://localhost:5000)           │
│                                                          │
│  ┌──────────────────────────────────────────┐           │
│  │    MongoDB Database                       │           │
│  │  - User configuration                     │           │
│  │  - Schedule times                         │           │
│  │  - Auto-send/sync enabled flags           │           │
│  └──────────────────────────────────────────┘           │
│                     ▲                                    │
│                     │                                    │
│  ┌──────────────────┴───────────────────────┐           │
│  │   Scheduler Service (node-cron)          │           │
│  │                                           │           │
│  │  Notification Scheduler                  │           │
│  │  ├─ Checks time every minute             │           │
│  │  ├─ Runs at scheduled time               │           │
│  │  ├─ Generates AI reminders               │           │
│  │  └─ Sends emails automatically           │           │
│  │                                           │           │
│  │  Sync Scheduler                          │           │
│  │  ├─ Checks time every minute             │           │
│  │  ├─ Runs at scheduled time               │           │
│  │  ├─ Fetches Google Sheets data           │           │
│  │  └─ Updates database                     │           │
│  └───────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
         │                            │
         │ Send emails               │ Fetch CSV
         ▼                            ▼
    Email Service               Google Sheets
```

### Flow

1. **User configures schedule** (browser)
   - Sets time: e.g., "18:00"
   - Enables auto-send: ✅
   - Enables email notifications: ✅

2. **Frontend saves to backend** (HTTP POST)

   ```javascript
   POST /api/notifications/config
   {
     scheduledTime: "18:00",
     autoSend: true,
     emailEnabled: true,
     isEnabled: true
   }
   ```

3. **Backend updates database** (MongoDB)
   - Saves user configuration
   - Persists to disk

4. **Backend starts scheduler** (node-cron)

   ```typescript
   // Creates a cron job: "0 18 * * *" (runs daily at 6 PM)
   cron.schedule("0 18 * * *", async () => {
     // Fetch balances
     // Generate AI reminders
     // Send emails
   });
   ```

5. **Scheduler runs independently**
   - ⏰ Server checks time every minute
   - 🎯 At 18:00, scheduler triggers
   - 📊 Fetches latest data
   - 🤖 Generates AI reminders
   - 📧 Sends emails automatically
   - ✅ All happens without browser!

---

## 🧪 Testing

### Test Auto-Send Notifications

1. **Configure schedule:**

   ```
   - Go to Notification Center
   - Set scheduled time (e.g., 18:00)
   - Enable "Auto-Send via Email"
   - Enable "Enable Email Notifications"
   - Turn "AUTO ON"
   ```

2. **Test immediately** (without waiting):

   ```bash
   # Option 1: Use Test Now button in UI

   # Option 2: Use API directly
   curl -X POST http://localhost:5000/api/notifications/trigger-manual-run \
     -H "Cookie: your-session-cookie" \
     --cookie-jar cookies.txt
   ```

3. **Check server logs:**
   ```
   🔔 Running scheduled notification task...
   📊 Fetching balances...
   🤖 Generating AI reminders...
   📧 Sending email to user@example.com...
   ✅ Email sent successfully
   ```

### Test Auto-Sync

1. **Configure schedule:**

   ```
   - Go to Data Entry
   - Add Google Sheets CSV URL
   - Enable "Auto-Fetch Scheduler"
   - Set sync time (e.g., 09:00)
   ```

2. **Test immediately:**

   ```
   - Click "Test Now" button

   OR

   curl -X POST http://localhost:5000/api/sheet/trigger-manual-sync \
     -H "Cookie: your-session-cookie"
   ```

3. **Check server logs:**
   ```
   🔄 Running scheduled sync task...
   📥 Fetching from Google Sheets...
   💾 Saving to database...
   ✅ Sync complete
   ```

### Verify Schedulers Are Active

```bash
# Check scheduler status
curl -X GET http://localhost:5000/api/notifications/scheduler-status \
  --cookie cookies.txt

# Response:
{
  "success": true,
  "total": 2,
  "schedulers": [
    { "userId": "123", "type": "notification", "isRunning": true },
    { "userId": "123", "type": "sync", "isRunning": true }
  ]
}
```

---

## ✨ Benefits

### ✅ Works When Browser is Closed

- Schedulers run on server
- No browser/tab needed
- True 24/7 automation

### ✅ Reliable

- Server restarts restore schedulers from database
- Won't miss scheduled times
- Production-ready

### ✅ Scalable

- Each user has independent schedule
- Multiple users = multiple schedulers
- No conflicts

### ✅ Easy to Configure

- Simple UI controls
- Real-time updates
- Test buttons for verification

### ✅ Observable

- Server logs show when tasks run
- Status endpoint for monitoring
- Manual trigger for testing

---

## 🔧 Technical Details

### Scheduler Storage

**Database Schema (User model):**

```typescript
{
  // Notification scheduler
  notificationConfig: {
    scheduledTime: "18:00",     // When to run
    isEnabled: true,             // Master switch
    autoSend: true,              // Auto-send emails
    emailEnabled: true,          // Email feature enabled
    threshold: 100,              // Balance threshold
    tone: "friendly"             // AI tone
  },

  // Sync scheduler
  autoSyncEnabled: true,         // Auto-sync enabled
  autoSyncTime: "09:00",         // When to sync
  csvUrl: "https://..."          // Google Sheets URL
}
```

### Scheduler Lifecycle

**1. Server Start:**

```typescript
// On server startup
connectDB();
setTimeout(async () => {
  await schedulerService.initializeAllSchedulers();
}, 2000);

// Loads all users with auto-features enabled
// Creates cron jobs for each user
```

**2. Configuration Change:**

```typescript
// When user updates config
await user.save();

// Restart scheduler with new time
if (isEnabled && autoSend && emailEnabled) {
  await schedulerService.startNotificationScheduler(userId);
} else {
  schedulerService.stopScheduler(userId, "notification");
}
```

**3. Scheduled Execution:**

```typescript
// At scheduled time (e.g., 18:00)
cron.schedule("0 18 * * *", async () => {
  await schedulerService.runNotificationTask(userId);
});

// Inside runNotificationTask:
// - Fetch data
// - Generate reminders
// - Send emails
// - Log results
```

### Cron Expression Format

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 6)
 │ │ │ │ │
 * * * * *

Examples:
"0 18 * * *"  → Daily at 6:00 PM
"30 9 * * *"  → Daily at 9:30 AM
"0 */6 * * *" → Every 6 hours
```

---

## 🚀 Deployment Notes

### Prerequisites

- ✅ Server must be running continuously (use PM2, systemd, or hosting service)
- ✅ MongoDB connection must be stable
- ✅ Environment variables must be configured

### Production Setup

**Using PM2 (Recommended):**

```bash
# Install PM2
yarn global add pm2

# Start server with PM2
pm2 start server/server.ts --name mealshare-api

# Enable auto-restart on reboot
pm2 startup
pm2 save
```

**Using systemd:**

```ini
[Unit]
Description=MealShare API Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/MealSahreAI
ExecStart=/usr/bin/node /path/to/dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

### Monitoring

```bash
# Check server logs
pm2 logs mealshare-api

# Check scheduler status via API
curl http://localhost:5000/api/notifications/scheduler-status

# Monitor server uptime
pm2 status
```

---

## 📝 Summary

### What Changed

- ❌ **Removed:** Client-side scheduling (browser-dependent)
- ✅ **Added:** Server-side scheduling (independent)
- ✅ **Result:** True 24/7 automation

### User Impact

- ✅ **Set and forget:** Configure once, works forever
- ✅ **No browser needed:** Close all tabs, it still works
- ✅ **Reliable:** Won't miss scheduled tasks
- ✅ **Testable:** Manual trigger buttons for testing

### Technical Impact

- ✅ **Production-ready:** Designed for always-on servers
- ✅ **Scalable:** Per-user independent schedulers
- ✅ **Observable:** Logs and status endpoints
- ✅ **Maintainable:** Clean separation of concerns

---

**Last Updated:** January 28, 2026  
**Version:** 3.0.0 - Server-Side Scheduling Implementation
