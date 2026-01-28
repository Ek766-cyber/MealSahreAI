# 🚀 Quick Deploy & Test Guide

## Problem Solved

✅ Email sending error: "Missing required fields"
✅ Schedulers not triggering after deployment

## 📦 What's New

- Enhanced body parsing for emails
- New scheduled function for auto-tasks
- Better error messages with debug info
- Manual trigger endpoint for testing

## 🎯 Deploy Now

```bash
# 1. Add all changes
git add .

# 2. Commit
git commit -m "Fix email sending and add scheduled tasks for Netlify"

# 3. Push to deploy
git push origin main
```

## ⚡ Quick Test (After Deploy)

### Test 1: Email Sending

1. Log in to your app
2. Open browser console (F12)
3. Paste and run:

```javascript
fetch("/.netlify/functions/server-cjs/api/notifications/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    name: "Test User",
    message: "Test email from Netlify",
    amountOwed: 100,
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

**Expected**: `{ success: true, message: "Email sent..." }`

### Test 2: Scheduled Tasks (Manual Trigger)

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

**Expected**: `{ success: true, message: "Scheduled tasks triggered..." }`

## 🔍 Check Logs

Go to: **Netlify Dashboard → Functions → server-cjs → Logs**

Look for:

- `📥 POST /api/notifications/send-email` - Request received
- `📧 Send email request received:` - Body parsed
- `✅ Email sent to` - Success!

## ✅ Verify Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, ensure:

- ✓ `EMAIL_USER` - Your Gmail
- ✓ `EMAIL_PASSWORD` - Gmail app password
- ✓ `MONGODB_URI` - Database connection
- ✓ `GEMINI_API_KEY` - For AI reminders

## 📅 Scheduled Tasks

- Runs automatically every hour at :00
- Check logs: **Functions → scheduled-tasks → Logs**
- Manual trigger available for testing

## 🆘 Something Wrong?

### Email Not Sending?

1. Check Netlify function logs
2. Verify EMAIL_USER and EMAIL_PASSWORD are set
3. Look for error messages in response

### Scheduler Not Running?

1. Go to Netlify Dashboard → Functions
2. Check if `scheduled-tasks` exists
3. Should have a clock/schedule badge
4. Check logs for errors

## 📚 More Info

- **DEPLOY_CHECKLIST.md** - Step-by-step checklist
- **FIX_SUMMARY.md** - What was fixed and why
- **NETLIFY_EMAIL_SCHEDULER_FIX.md** - Technical details

## 🎉 You're All Set!

After deploying and testing, your app should:

- ✅ Send emails without errors
- ✅ Auto-sync data at scheduled times
- ✅ Auto-send reminders at scheduled times
- ✅ Show helpful debug info if issues occur

---

**Need help?** Check the Netlify function logs first - they show everything!
