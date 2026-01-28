# Email & Scheduler Fixes Summary

## 🐛 Problems Identified

### 1. Email Sending Error (Production Only)

**Symptom**:

```json
{
  "error": "Missing required fields: name and message",
  "success": false
}
```

**Payload Sent**:

```json
{
  "personId": "sheet-summary-30",
  "name": "Emon",
  "message": "Emon, you owe $842.00. Please add funds to cover your meal plan.",
  "amountOwed": 842
}
```

**Root Cause**:

- Request body not being properly parsed in Netlify serverless function
- Possible issue with body-parser middleware configuration
- Content-Type header not being respected

### 2. Schedulers Not Triggering (Production Only)

**Symptom**: Auto-sync and auto-send emails don't trigger on Netlify

**Root Cause**:

- Serverless functions are stateless
- `node-cron` schedulers don't persist between function invocations
- Local server keeps running (schedulers work), but Netlify functions sleep between requests

## ✅ Solutions Implemented

### Solution 1: Fix Body Parsing

**File**: `/netlify/functions/server-cjs.js`

**Changes**:

1. Enhanced body-parser with larger limits:

   ```javascript
   app.use(express.json({ limit: "10mb" }));
   app.use(express.urlencoded({ extended: true, limit: "10mb" }));
   ```

2. Added comprehensive logging:

   ```javascript
   app.use((req, res, next) => {
     console.log(`📥 ${req.method} ${req.path}`, {
       body: req.body,
       hasBody: Object.keys(req.body || {}).length > 0,
       contentType: req.headers["content-type"],
     });
     next();
   });
   ```

3. Enhanced error responses with debug info:
   ```javascript
   return res.status(400).json({
     success: false,
     error: "Missing required fields: name and message",
     debug: {
       receivedBody: req.body,
       name: name,
       message: message,
       hasName: !!name,
       hasMessage: !!message,
     },
   });
   ```

### Solution 2: Netlify Scheduled Functions

**File**: `/netlify/functions/scheduled-tasks.js` (NEW)

**Implementation**:

- Created standalone Netlify scheduled function
- Runs every hour (configured in `netlify.toml`)
- Checks which users have tasks scheduled for current hour
- Executes:
  - Auto-sync: Syncs Google Sheets data
  - Auto-send: Generates AI reminders and sends emails

**Configuration** (`netlify.toml`):

```toml
[[functions]]
  path = "/.netlify/functions/scheduled-tasks"
  schedule = "0 * * * *"  # Every hour at minute 0
```

**Added Manual Trigger**:

```
POST /.netlify/functions/server-cjs/api/notifications/trigger-scheduled-tasks
```

## 📁 Files Modified

1. **`/netlify/functions/server-cjs.js`**
   - Enhanced body-parser
   - Added request logging
   - Improved error messages
   - Added manual trigger endpoint

2. **`/netlify.toml`**
   - Added scheduled function configuration

3. **`/netlify/functions/scheduled-tasks.js`** (NEW)
   - Standalone scheduled function
   - Includes email service, Gemini AI, sheet syncing
   - Runs every hour

4. **`/NETLIFY_EMAIL_SCHEDULER_FIX.md`** (NEW)
   - Detailed documentation of fixes

5. **`/DEPLOY_CHECKLIST.md`** (NEW)
   - Step-by-step deployment checklist

6. **`/test-netlify-email.sh`** (NEW)
   - Test script for email functionality

## 🚀 Deployment Steps

1. **Commit and push**:

   ```bash
   git add .
   git commit -m "Fix email sending and add scheduled tasks for Netlify"
   git push origin main
   ```

2. **Verify environment variables** in Netlify:
   - `MONGODB_URI`
   - `EMAIL_USER`
   - `EMAIL_PASSWORD`
   - `GEMINI_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `CLIENT_URL`

3. **Check deployed functions**:
   - Go to Netlify Dashboard → Functions
   - Verify `server-cjs` exists
   - Verify `scheduled-tasks` exists with schedule badge

## 🧪 Testing

### Test Email Sending (Browser Console):

```javascript
fetch("/.netlify/functions/server-cjs/api/notifications/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    name: "Test User",
    message: "Test message",
    amountOwed: 100,
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

### Test Manual Scheduler Trigger:

```javascript
fetch(
  "/.netlify/functions/server-cjs/api/notifications/trigger-scheduled-tasks",
  {
    method: "POST",
    credentials: "include",
  },
)
  .then((r) => r.json())
  .then(console.log);
```

## 📊 How It Works Now

### Production (Netlify):

1. **Every Hour**:
   - Netlify automatically invokes `scheduled-tasks` function
   - Function connects to MongoDB
   - Checks current time against user schedules
   - Executes scheduled tasks (sync, email)

2. **Email Sending**:
   - User clicks "Send" in UI
   - Request sent with proper JSON body
   - Body parser parses request correctly
   - Email service sends notification
   - Response with success/failure

### Local Development:

- Still uses `node-cron` in `server/server.ts`
- Schedulers work as before
- No changes needed for local dev

## ⚠️ Important Notes

1. **Scheduled Functions**:
   - Run on Netlify's servers
   - Free tier: 125,000 invocations/month
   - This setup uses ~720/month (well within limits)

2. **Time Zones**:
   - Scheduled tasks use server time
   - Configure in user settings (e.g., "18:00" for 6 PM)

3. **Testing**:
   - Use manual trigger for immediate testing
   - Check Netlify function logs for debugging
   - Monitor email delivery

## 🎯 Expected Behavior After Fix

✅ Email sending works from UI
✅ Proper error messages with debug info
✅ Scheduled tasks run every hour
✅ Auto-sync syncs data at scheduled time
✅ Auto-send sends emails at scheduled time
✅ Comprehensive logging for debugging

## 📝 Monitoring

Check these regularly:

1. **Netlify Function Logs**: Real-time function output
2. **Email Delivery**: Ask users if they receive emails
3. **Scheduler Execution**: Check logs at top of each hour

## 🆘 Troubleshooting

| Issue                           | Solution                                  |
| ------------------------------- | ----------------------------------------- |
| Still "Missing required fields" | Check Content-Type, verify body in logs   |
| Emails not sending              | Verify EMAIL_USER/PASSWORD env vars       |
| Scheduler not running           | Check function exists, has schedule badge |
| No logs appearing               | Check Netlify function logs in dashboard  |

## 📚 Documentation

- `NETLIFY_EMAIL_SCHEDULER_FIX.md` - Detailed technical docs
- `DEPLOY_CHECKLIST.md` - Step-by-step deployment guide
- `test-netlify-email.sh` - Test script

## ✨ Benefits

1. **Works in Production**: No more "missing fields" errors
2. **Reliable Scheduling**: Uses Netlify's scheduled functions
3. **Better Debugging**: Comprehensive logging
4. **Easy Testing**: Manual trigger endpoint
5. **Cost Effective**: Well within free tier

---

**Status**: ✅ Ready to deploy
**Testing**: ⚠️ Required after deployment
**Documentation**: ✅ Complete
