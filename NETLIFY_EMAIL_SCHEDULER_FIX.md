# Email and Scheduler Fixes for Netlify Deployment

## Issues Fixed

### 1. Email Sending Error: "Missing required fields: name and message"

**Problem**: The request body was not being properly parsed in the Netlify serverless function, causing the `name` and `message` fields to be undefined even though they were sent from the frontend.

**Solution Applied**:

- Enhanced body-parser middleware with larger size limits (`10mb`)
- Added comprehensive request logging to debug body parsing issues
- Added detailed error responses that show what the server actually received
- Improved error handling and debugging information in the `/api/notifications/send-email` endpoint

### 2. Auto-Sync and Email Scheduler Not Triggering After Deployment

**Problem**: Serverless functions on Netlify are stateless and don't keep running between requests. The cron-based schedulers that work locally don't work in a serverless environment.

**Solution Applied**:

- Created a new Netlify scheduled function: `netlify/functions/scheduled-tasks.js`
- This function runs every hour (configured in `netlify.toml`)
- It checks all users who have auto-send or auto-sync enabled
- Executes scheduled tasks based on each user's configured time
- Added a manual trigger endpoint for testing: `/api/notifications/trigger-scheduled-tasks`

## Files Modified

### 1. `/netlify/functions/server-cjs.js`

- Enhanced body-parser configuration with size limits
- Added request logging middleware
- Improved error messages in `/api/notifications/send-email`
- Added manual trigger endpoint for testing scheduled tasks

### 2. `/netlify.toml`

- Added scheduled function configuration to run every hour

### 3. `/netlify/functions/scheduled-tasks.js` (NEW)

- Standalone scheduled function for handling:
  - Auto email notifications
  - Auto data synchronization
- Runs every hour and checks which users need tasks executed
- Includes full email service, Gemini AI integration, and sheet syncing

## How Scheduled Tasks Work Now

### On Netlify (Production):

1. Netlify runs `scheduled-tasks.js` every hour at minute 0
2. The function checks the current time
3. For each user with auto-send enabled:
   - Syncs their sheet data
   - Generates AI reminders
   - Sends emails to members who owe money
4. For each user with auto-sync enabled:
   - Syncs their sheet data

### Testing Scheduled Tasks:

You can manually trigger the scheduled tasks by making a POST request to:

```
POST https://your-app.netlify.app/.netlify/functions/server-cjs/api/notifications/trigger-scheduled-tasks
```

## Deployment Steps

### 1. Environment Variables (CRITICAL)

Make sure these are set in Netlify dashboard:

```
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
CLIENT_URL=https://your-app.netlify.app
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Deploy to Netlify

```bash
# Commit changes
git add .
git commit -m "Fix email sending and add scheduled tasks for Netlify"
git push origin main
```

### 3. Enable Scheduled Functions in Netlify

1. Go to your Netlify dashboard
2. Navigate to Site settings > Functions
3. Ensure "Background functions" are enabled
4. The scheduled function should appear in Functions list

### 4. Test Email Sending

1. Log in to your app
2. Go to Notification Center
3. Generate reminders
4. Try sending a test email
5. Check browser console and Netlify function logs for any errors

### 5. Test Scheduled Tasks

Option A - Wait for automatic execution:

- Wait until the next hour mark (e.g., 2:00, 3:00)
- Check Netlify function logs to see if scheduled-tasks ran

Option B - Manual trigger (recommended for testing):

```bash
# From your browser console or Postman
fetch('https://your-app.netlify.app/.netlify/functions/server-cjs/api/notifications/trigger-scheduled-tasks', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

## Monitoring and Debugging

### Check Netlify Function Logs:

1. Go to Netlify dashboard
2. Navigate to Functions
3. Click on `server-cjs` or `scheduled-tasks`
4. View real-time logs

### What to Look For:

- ✅ `📥 POST /api/notifications/send-email` - Request received
- ✅ `📧 Send email request received:` - Body parsed correctly
- ✅ `✅ Email sent to` - Email sent successfully
- ✅ `🕐 Scheduled task triggered at` - Scheduler running
- ❌ `❌ Missing required fields` - Body not parsed (check Content-Type)
- ❌ `❌ Email service not initialized` - Email env vars missing

## Common Issues and Solutions

### Issue: Still getting "Missing required fields" error

**Check**:

1. Request Content-Type header is `application/json`
2. Request body is valid JSON
3. Check Netlify function logs for body parsing errors
4. Look for the debug info in error response

### Issue: Emails not sending automatically

**Check**:

1. Netlify scheduled functions are enabled
2. User has all three settings enabled:
   - `isEnabled: true`
   - `autoSend: true`
   - `emailEnabled: true`
3. Check scheduled-tasks function logs
4. Verify email credentials are set in Netlify env vars

### Issue: Scheduled function not appearing in Netlify

**Check**:

1. `netlify.toml` has the `[[functions]]` section
2. Redeploy the site after adding scheduled function
3. Check Netlify dashboard > Functions for `scheduled-tasks`

## Cost Considerations

Netlify scheduled functions:

- Run every hour = 24 times per day
- Each execution = 1 function invocation
- Free tier includes 125,000 function requests/month
- This schedule uses: 24 × 30 = 720 invocations/month (well within free tier)

## Further Improvements

1. **Add user notification preferences**:
   - Let users choose specific days for reminders
   - Support multiple notification times

2. **Add webhook support**:
   - Alternative to scheduled functions
   - Can be triggered by external cron services

3. **Add email delivery tracking**:
   - Store email send history in database
   - Show users when last email was sent

4. **Optimize scheduled function**:
   - Only run if at least one user has tasks scheduled for current hour
   - Add rate limiting to prevent abuse

## Testing Checklist

- [ ] Email sending works from Notification Center
- [ ] Error messages show debug information
- [ ] Netlify function logs show request body
- [ ] Scheduled function appears in Netlify dashboard
- [ ] Manual trigger endpoint works
- [ ] Auto-sync syncs data at scheduled time
- [ ] Auto-send sends emails at scheduled time
- [ ] Email credentials are properly configured
- [ ] All environment variables are set
