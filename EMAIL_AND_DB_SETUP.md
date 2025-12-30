# Email Notification & Data Persistence Setup Guide

## ✅ What's Been Implemented

### 1. Email Notification System

- **Email Service**: Sends beautiful HTML emails to members with payment reminders
- **API Endpoints**: `/api/notifications/send-email`, `/api/notifications/send-batch-emails`, `/api/notifications/test-email`
- **Member Email Lookup**: Automatically finds member emails from the database based on their sheet names
- **Error Handling**: Comprehensive logging and error messages

### 2. Data Persistence (CSV Link & Last Fetch Time)

- **Database Storage**: CSV URL and last fetch time are now saved in the User model
- **Auto-Load**: When you open the app, your saved CSV URL loads automatically
- **Fetch History**: Track when data was last synced from Google Sheets
- **API Endpoints**: `/api/sheet/config` (GET/POST/DELETE), `/api/sheet/update-fetch-time`

## 🔧 Configuration

### Email Setup (Gmail)

Your current `.env` configuration:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=emon122734@gmail.com
EMAIL_PASSWORD=jidsvzgpurdupzre
```

### How to Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security** from the left menu
3. Under "How you sign in to Google," select **2-Step Verification** (you must enable this first)
4. Scroll to the bottom and select **App passwords**
5. Select app: **Mail**
6. Select device: **Other (Custom name)** → Enter "MealShare AI"
7. Click **Generate**
8. Copy the 16-character password (without spaces)
9. Update your `.env` file with this password

## 🐛 Troubleshooting Email Issues

### Check Email Service Status

1. **In the Application**:

   - Go to Notification Center
   - Click the settings gear icon
   - Click "Check Email Configuration"
   - You should see a success message with your email host info

2. **Test Email Endpoint**:

   ```bash
   # While logged in, test sending an email to yourself
   curl -X GET http://localhost:5000/api/notifications/test-email \
     -H "Cookie: your-session-cookie" \
     --cookie-jar cookies.txt
   ```

3. **Check Server Logs**:
   Look for these messages when the server starts:
   - ✅ `✉️  Email service initialized`
   - ❌ `⚠️  Email credentials not configured. Email service disabled.`

### Common Issues & Solutions

#### Issue 1: "Email service not initialized"

**Solution**:

- Make sure `EMAIL_USER` and `EMAIL_PASSWORD` are set in `.env`
- Restart the server: `yarn server`
- Check server logs for initialization message

#### Issue 2: "No email found for member"

**Solution**:

- Go to **Member Manager** section
- Add members with their exact sheet names
- Make sure email addresses are valid
- Sheet names must match exactly (case-insensitive)

Example:

```
Sheet Name: Sayem
Email: sayem@example.com
Phone: (optional)
```

#### Issue 3: "Invalid credentials" or "Authentication failed"

**Solution**:

- Verify your Gmail App Password is correct (16 characters, no spaces)
- Make sure 2-Step Verification is enabled on your Google Account
- Try generating a new App Password
- Update `.env` and restart server

#### Issue 4: "Less secure app access"

**Solution**:

- Gmail no longer supports "less secure apps"
- You MUST use an App Password (see setup instructions above)
- Regular Gmail passwords will NOT work

## 📊 Database Schema Updates

### User Model

```typescript
{
  googleId: string;
  email: string;
  name: string;
  photoURL?: string;
  csvUrl?: string;          // NEW: Saved Google Sheet CSV URL
  lastFetchTime?: Date;     // NEW: Last time data was fetched
  createdAt: Date;
  lastLogin: Date;
}
```

## 🚀 How to Use

### Using Email Notifications

1. **Configure Email Service** (one-time setup):

   - Set up Gmail App Password in `.env`
   - Restart server
   - Click "Check Email Configuration" to verify

2. **Add Members**:

   - Go to Member Manager
   - Add each person with their sheet name and email
   - Sheet names must match exactly as they appear in your Google Sheet

3. **Send Notifications**:
   - Go to Notification Center
   - Enable email notifications
   - Click "Generate Messages Now"
   - Review generated messages
   - Click "Send via Email" for individual messages
   - Or click "Send All" for batch sending

### Using Data Persistence

1. **First Time Setup**:

   - Go to Data Entry section
   - Paste your Google Sheet CSV URL
   - Click "Sync Now"
   - URL is automatically saved to database

2. **Next Time You Visit**:

   - CSV URL loads automatically
   - See "Last synced" timestamp
   - Just click "Sync Now" to refresh data

3. **Auto-Sync** (Optional):
   - Enable "Auto-Fetch Scheduler"
   - Set your preferred daily sync time
   - Keep the browser tab open
   - Data syncs automatically at the scheduled time

## 🔍 Debugging Commands

### Check if server is receiving email requests

```bash
# Check server logs while sending email
tail -f server.log

# You should see:
# 📧 Send email request: { personId: '...', name: 'John', email: null }
# 🔍 Member lookup result: Found: john@example.com
# 📮 Sending email to: john@example.com
# ✅ Email sent successfully
```

### Test database connection

```bash
# In Node.js/MongoDB shell
use mealshare
db.users.findOne()  // Should show your user with csvUrl field
```

### Manual email test using curl

```bash
# First, login and save cookies
curl -X GET http://localhost:5000/auth/google/callback \
  --cookie-jar cookies.txt

# Then test email
curl -X POST http://localhost:5000/api/notifications/send-email \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "This is a test message",
    "amountOwed": 100
  }'
```

## 📝 Next Steps

If emails still aren't sending:

1. **Check the browser console** for frontend errors
2. **Check the server terminal** for detailed error logs
3. **Verify member emails** are correctly saved in the database
4. **Test with the `/api/notifications/test-email` endpoint**
5. **Ensure you're logged in** (email endpoints require authentication)
6. **Check Gmail settings** for blocked sign-in attempts

## 🎯 Quick Checklist

- [ ] Gmail App Password generated and added to `.env`
- [ ] Server restarted after updating `.env`
- [ ] "Email service initialized" appears in server logs
- [ ] "Check Email Configuration" shows success
- [ ] Members added in Member Manager with valid emails
- [ ] Sheet names match exactly between Google Sheet and Member Manager
- [ ] User is logged in when testing email
- [ ] Email enabled checkbox is checked in Notification Center

## 💡 Tips

- Always check server logs first when debugging
- Member sheet names are case-insensitive but must match
- Email sending includes a 500ms delay between each to avoid rate limiting
- Test with your own email first before sending to others
- The app shows "sent" status even if email fails - check server logs for actual status
