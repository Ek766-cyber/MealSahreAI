# 🎯 Quick Actions for Production Deployment

## ⚡ Immediate Actions Required

### 1. **Update Netlify Environment Variables** (5 minutes)

Go to: https://app.netlify.com/sites/mealshareai/settings/env

Add/Update these variables:

```env
GEMINI_API_KEY=<copy-from-your-.env-file>
MONGODB_URI=<copy-from-your-.env-file>
GOOGLE_CLIENT_ID=<copy-from-your-.env-file>
GOOGLE_CLIENT_SECRET=<copy-from-your-.env-file>
GOOGLE_CALLBACK_URL=https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback
SESSION_SECRET=<generate-using-crypto-or-copy-from-.env>
NODE_ENV=production
CLIENT_URL=https://mealshareai.netlify.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASSWORD=<your-email-app-password>
```

**📋 Copy all values from your local `.env` file - do NOT use these placeholders directly!**

### 2. **Update Google OAuth Console** (3 minutes)

Go to: https://console.cloud.google.com/apis/credentials

1. Click on your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, add:
   ```
   https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback
   ```
3. Click **SAVE**

### 3. **Deploy to Netlify** (2 minutes)

```bash
# Commit your changes
git add .
git commit -m "Configure production deployment with Netlify"
git push origin main
```

Netlify will automatically deploy your changes.

---

## ✅ What Was Fixed

1. ✅ **Updated `.env`** - Changed URLs from localhost to production Netlify URLs
2. ✅ **Updated `App.tsx`** - All API calls now use environment variables
3. ✅ **Updated `Login.tsx`** - Authentication uses correct API URL
4. ✅ **Updated `passport.ts`** - OAuth callback uses production URL
5. ✅ **Created `.env.local`** - For local development
6. ✅ **Created `.env.production`** - For production builds
7. ✅ **Generated secure SESSION_SECRET** - Production-ready secret
8. ✅ **Created `DEPLOYMENT_GUIDE.md`** - Complete deployment instructions

---

## 🔍 How API URLs Work Now

### Development (Local):

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:5000`
- Uses `.env.local` or `.env` with localhost URLs

### Production (Netlify):

- Frontend: `https://mealshareai.netlify.app`
- Backend: `https://mealshareai.netlify.app/.netlify/functions/server`
- Uses Netlify environment variables

The app automatically detects the environment using `import.meta.env.VITE_API_URL`:

- In production: Uses `/.netlify/functions/server` (relative path)
- In development: Uses `http://localhost:5000`

---

## 🧪 Testing After Deployment

1. **Visit**: https://mealshareai.netlify.app
2. **Click**: "Continue with Google"
3. **Expected**: Should redirect to Google OAuth (not localhost)
4. **After login**: Should redirect back to https://mealshareai.netlify.app

### Test API Health:

```bash
curl https://mealshareai.netlify.app/.netlify/functions/server/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "MealShare API is running on Netlify",
  "timestamp": "2026-01-01T..."
}
```

---

## 🐛 If Something Goes Wrong

### Issue: Still redirects to localhost

- Clear browser cache and cookies
- Check Netlify env vars are saved
- Verify Google Console has production URL
- Wait 1-2 minutes for deployment to complete

### Issue: "Redirect URI mismatch" error

- Go to Google Console and verify the exact URL:
  ```
  https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback
  ```
- Make sure there are no trailing slashes or typos

### Issue: Session not working

- Verify `SESSION_SECRET` is set in Netlify
- Check that `NODE_ENV=production` is set
- Ensure browser allows cookies

---

## 📋 Checklist

- [ ] Updated Netlify environment variables
- [ ] Added production URL to Google OAuth Console
- [ ] Pushed code to GitHub
- [ ] Waited for Netlify deployment to complete
- [ ] Tested Google login on production site
- [ ] Verified API health endpoint works

---

## 🎉 Done!

Once you complete the 3 immediate actions above, your app will be fully deployed and working on Netlify!

For more details, see: `DEPLOYMENT_GUIDE.md`
