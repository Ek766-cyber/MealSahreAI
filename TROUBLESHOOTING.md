# 🔧 Troubleshooting Guide - Email & Data Persistence Issues

## Issues Fixed

### 1. ✅ CORS Configuration Updated

- **Problem**: Frontend running on port 3001, but CORS was set to port 5173
- **Fix**: Updated `server/server.ts` CORS origin to `http://localhost:3001`

### 2. ✅ API URLs Fixed

- **Problem**: Frontend was using relative URLs (`/api/...`) which don't work with separate backend
- **Fix**: Updated all API calls to use absolute URL `http://localhost:5000/api/...`

### 3. ✅ Authentication Check Added

- **Problem**: App was using only localStorage, not checking backend session
- **Fix**: App now checks `/auth/user` endpoint on mount to verify backend session

### 4. ✅ Better Error Handling

- **Problem**: Silent failures with no user feedback
- **Fix**: Added authentication error detection and user alerts

## How to Test

### Step 1: Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Start fresh
cd /home/emon/MealSahreAI
yarn server
```

You should see:

```
✉️  Email service initialized
🚀 Server running on http://localhost:5000
✅ MongoDB Connected Successfully
```

### Step 2: Open the Test Page

Open `test-auth.html` in your browser:

```bash
# In a new terminal
cd /home/emon/MealSahreAI
open test-auth.html
# or
xdg-open test-auth.html  # Linux
```

The test page will automatically check your authentication status.

### Step 3: Test Authentication Flow

1. **Click "Login with Google"**

   - Should redirect to Google login
   - After login, redirects back to your app
   - Check browser console for authentication logs

2. **Click "Check Auth"**

   - Should show ✅ Authenticated with your user details
   - If shows ❌, you need to login

3. **Test Email Status**

   - Click "Test Email Status"
   - Should show email configuration details
   - If 401 error, login first

4. **Test Sheet Config**

   - Click "Get Sheet Config" to retrieve saved config
   - Click "Save Test Config" to save a test URL
   - Should work without 401 errors

5. **Test Send Email**
   - Add a member in Member Manager first
   - Enter their name in the test page
   - Click "Test Send Email"
   - Check server logs for email sending

### Step 4: Test in Main Application

1. **Start Frontend**

```bash
cd /home/emon/MealSahreAI
yarn dev
```

2. **Open Application**

- Go to http://localhost:3001
- Login with Google if not already logged in
- Check browser console for authentication status

3. **Test Data Persistence**

- Go to Data Entry section
- Paste a Google Sheet CSV URL
- Click "Sync Now"
- **Check browser console** for these logs:
  ```
  ✅ CSV URL saved: https://docs.google.com/...
  ✅ Fetch time updated: 2025-12-13T...
  ```
- Refresh the page
- **CSV URL should load automatically**
- Should see "Last synced: [timestamp]"

4. **Test Email Notifications**

- Add members in Member Manager (Sheet Name + Email)
- Go to Notification Center
- Click settings gear icon
- Click "Check Email Configuration"
  - Should see ✅ success message
  - If not, check server logs
- Enable email notifications checkbox
- Click "Generate Messages Now"
- Click "Send via Email" on a message
- **Check browser console and server logs**

## Debugging With Server Logs

The server now logs all API requests with authentication status:

```bash
# In server terminal, you'll see:
📍 POST /api/notifications/send-email - Auth: ✅
   User: your-email@gmail.com

# Or if not authenticated:
📍 POST /api/notifications/send-email - Auth: ❌
```

### What to Look For:

**Good Authentication:**

```
📍 POST /api/sheet/config - Auth: ✅
   User: emon122734@gmail.com
✅ CSV URL saved for user emon122734@gmail.com
```

**Bad Authentication (Not Logged In):**

```
📍 POST /api/sheet/config - Auth: ❌
```

**Email Sending:**

```
📧 Send email request: { personId: 'xxx', name: 'Sayem', email: null }
🔍 Member lookup result: Found: sayem@example.com
📮 Sending email to: sayem@example.com
📧 Attempting to send email to: sayem@example.com
✅ Email sent successfully
📬 Accepted recipients: [ 'sayem@example.com' ]
```

## Common Issues & Solutions

### Issue 1: "401 Unauthorized" errors

**Cause**: Not logged in or session expired

**Solution**:

1. Open http://localhost:3001
2. You should see the Login page
3. Click "Continue with Google"
4. Complete Google OAuth
5. You'll be redirected back to the app
6. Check browser console for: `✅ User authenticated: your-email@gmail.com`

### Issue 2: CSV URL not saving

**Cause**: Authentication issue or API URL misconfiguration

**Solution**:

1. Check browser console when clicking "Sync Now"
2. Look for errors or 401 responses
3. Make sure you're logged in (see user profile icon in top right)
4. Check server logs for `📍 POST /api/sheet/config - Auth:` message
5. If Auth shows ❌, re-login

### Issue 3: "No email found for member"

**Cause**: Member not added in Member Manager

**Solution**:

1. Go to Member Manager section
2. Click "Add New Member"
3. Enter exact sheet name (e.g., "Sayem")
4. Enter email address
5. Save
6. Try sending email again
7. Check server logs for: `🔍 Member lookup result: Found: email@example.com`

### Issue 4: Email shows "sent" but not received

**Cause**: Either member lookup failed or email service issue

**Solution**:

1. Check server logs for the full email sending flow
2. Look for `✅ Email sent successfully` message
3. If you see `⚠️ No email found for member`, add the member
4. If you see SMTP errors, check your Gmail App Password
5. Test with: `npx tsx test-email.ts your-email@gmail.com`

## Quick Verification Commands

```bash
# 1. Check if server is running
curl http://localhost:5000/health

# 2. Check authentication status
curl http://localhost:5000/auth/user \
  -H "Cookie: connect.sid=your-session-cookie" \
  --cookie-jar cookies.txt

# 3. Test email directly
npx tsx test-email.ts your-email@gmail.com

# 4. Check MongoDB connection
# Look for "✅ MongoDB Connected Successfully" in server logs
```

## Environment Variables Checklist

Make sure your `.env` file has:

```env
# ✅ Backend
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=...

# ✅ Frontend URL
CLIENT_URL=http://localhost:3001

# ✅ Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

## Still Having Issues?

1. **Clear browser cookies and localStorage**:

   - Open browser DevTools (F12)
   - Application tab → Clear storage
   - Refresh page and login again

2. **Restart everything**:

   ```bash
   # Kill all processes
   pkill -f "yarn server"
   pkill -f "yarn dev"

   # Start fresh
   yarn server  # Terminal 1
   yarn dev     # Terminal 2
   ```

3. **Check browser console** for any errors

4. **Check server terminal** for detailed logs with 📍, 📧, ✅, ❌ icons

5. **Use test-auth.html** to isolate authentication issues

6. **Test email service** with: `npx tsx test-email.ts your-email@gmail.com`

## Success Criteria

You know everything is working when:

- ✅ `test-auth.html` shows "Authenticated" with your user details
- ✅ Browser console shows `✅ User authenticated` on app load
- ✅ Server logs show `Auth: ✅` for API requests
- ✅ CSV URL loads automatically when you refresh the app
- ✅ "Last synced" timestamp appears after syncing
- ✅ Server logs show `✅ CSV URL saved` and `✅ Fetch time updated`
- ✅ Email test succeeds: `npx tsx test-email.ts` sends email
- ✅ Server logs show `🔍 Member lookup result: Found:` when sending notifications
- ✅ You receive actual emails when clicking "Send via Email"
