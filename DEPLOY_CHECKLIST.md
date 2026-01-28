# Quick Deployment Checklist for Email & Scheduler Fixes

## 🚀 Pre-Deployment

- [ ] All files committed
  ```bash
  git add .
  git commit -m "Fix email sending and add scheduled tasks for Netlify"
  ```

## 🔧 Netlify Environment Variables

Verify these are set in Netlify Dashboard → Site Settings → Environment Variables:

### Database & Auth

- [ ] `MONGODB_URI` - Your MongoDB connection string
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- [ ] `SESSION_SECRET` - Random secret string
- [ ] `CLIENT_URL` - Your Netlify site URL (e.g., `https://your-app.netlify.app`)

### Email Configuration

- [ ] `EMAIL_USER` - Your Gmail address (e.g., `yourapp@gmail.com`)
- [ ] `EMAIL_PASSWORD` - Gmail app password (NOT your regular password)
- [ ] `EMAIL_HOST` - `smtp.gmail.com`
- [ ] `EMAIL_PORT` - `587`
- [ ] `EMAIL_SECURE` - `false`

### AI Service

- [ ] `GEMINI_API_KEY` - Your Google Gemini API key

## 📤 Deploy

```bash
git push origin main
```

Wait for Netlify to build and deploy.

## ✅ Post-Deployment Verification

### 1. Check Functions Deployed

- [ ] Go to Netlify Dashboard → Functions
- [ ] Verify `server-cjs` function exists
- [ ] Verify `scheduled-tasks` function exists
- [ ] Check that scheduled-tasks has a schedule badge

### 2. Test Email Sending

#### From Browser Console:

```javascript
// 1. First, log in to your app
// 2. Open browser console (F12)
// 3. Run this:

fetch("/.netlify/functions/server-cjs/api/notifications/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    name: "Test User",
    message: "This is a test email from Netlify deployment",
    amountOwed: 100,
  }),
})
  .then((r) => r.json())
  .then((data) => {
    console.log("Response:", data);
    if (data.success) {
      console.log("✅ Email sent successfully!");
    } else {
      console.error("❌ Error:", data.error);
      console.log("Debug info:", data.debug);
    }
  });
```

### 3. Test Manual Scheduler Trigger

```javascript
// From browser console (after logging in):
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

### 4. Check Logs

- [ ] Go to Netlify Dashboard → Functions → server-cjs → Logs
- [ ] Look for: `📧 Send email request received:`
- [ ] Verify body is being parsed correctly
- [ ] Check for any error messages

### 5. Verify Scheduled Tasks

- [ ] Wait for the top of any hour (e.g., 3:00 PM)
- [ ] Check Netlify Dashboard → Functions → scheduled-tasks → Logs
- [ ] Should see: `🕐 Scheduled task triggered at`
- [ ] Check if emails were sent (if any users have auto-send enabled)

## 🐛 Troubleshooting

### Issue: "Missing required fields: name and message"

**Quick Fix**:

1. Check Netlify function logs for the request body
2. Look for debug info in the error response
3. Verify Content-Type is `application/json`
4. Check if body-parser middleware is loaded

**Check in Logs**:

```
📥 POST /api/notifications/send-email { body: {...}, hasBody: true }
```

### Issue: Scheduled tasks not running

**Quick Fix**:

1. Verify scheduled function deployed: Netlify Dashboard → Functions
2. Check the function has a schedule badge
3. Manually trigger to test: Use the manual trigger endpoint
4. Check logs for any errors

### Issue: Emails not sending

**Quick Fix**:

1. Test email status: `GET /api/notifications/email-status`
2. Verify EMAIL_USER and EMAIL_PASSWORD are set
3. Check Gmail app password is correct
4. Look for SMTP errors in logs

## 📊 Monitor

### Check These Regularly:

1. **Function Invocations**: Netlify Dashboard → Analytics
2. **Error Rate**: Check function logs for errors
3. **Email Delivery**: Ask users if they're receiving emails

## 🎯 Success Criteria

- [x] App deploys without errors
- [x] Both functions appear in Netlify dashboard
- [x] Email sending works from UI
- [x] Manual scheduler trigger works
- [x] Scheduled tasks run every hour
- [x] Emails send automatically at scheduled times
- [x] Data syncs automatically at scheduled times

## 📝 Notes

- Scheduled functions run on Netlify's servers (not yours)
- Free tier includes 125,000 function invocations/month
- Scheduled task runs 24 times/day = ~720 times/month
- Well within free tier limits!

## 🆘 Need Help?

Check these documents:

- [NETLIFY_EMAIL_SCHEDULER_FIX.md](./NETLIFY_EMAIL_SCHEDULER_FIX.md) - Detailed fix explanation
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - General deployment guide
- Netlify function logs - Real-time debugging

## 🎉 Done!

Once all checkboxes are ticked, your deployment is complete and working! 🚀
