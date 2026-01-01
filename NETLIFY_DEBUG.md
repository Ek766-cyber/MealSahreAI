# 🔍 Netlify Deployment Debugging Guide

## Current Issue: "Cannot GET /.netlify/functions/server/auth/google"

This error means the Netlify function is not properly routing requests. Here's how to debug and fix:

---

## ✅ Step 1: Verify Netlify Environment Variables

Go to: https://app.netlify.com/sites/mealshareai/settings/env

**Required Variables:**

- `GEMINI_API_KEY`
- `MONGODB_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` = `https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback`
- `SESSION_SECRET` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `NODE_ENV` = `production`
- `CLIENT_URL` = `https://mealshareai.netlify.app`

**⚠️ After adding/updating variables, you MUST redeploy:**

```bash
# Trigger a new deployment
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## ✅ Step 2: Check Netlify Build Logs

1. Go to: https://app.netlify.com/sites/mealshareai/deploys
2. Click on the latest deploy
3. Look for errors in the build logs

**Common Issues:**

- TypeScript compilation errors
- Missing dependencies
- Build command failures

---

## ✅ Step 3: Test the Function Endpoints

### Test Health Check:

```bash
curl https://mealshareai.netlify.app/.netlify/functions/server
```

**Expected Response:**

```json
{
  "status": "ok",
  "message": "MealShare API is running on Netlify",
  "timestamp": "...",
  "env": {
    "nodeEnv": "production",
    "hasClientUrl": true,
    "hasGoogleClientId": true
  }
}
```

### Test Debug Endpoint:

```bash
curl https://mealshareai.netlify.app/.netlify/functions/server/debug
```

### Test Auth Route:

```bash
curl -v https://mealshareai.netlify.app/.netlify/functions/server/auth/google
```

**Expected:** Should redirect to Google OAuth (302 redirect)

---

## ✅ Step 4: Check Netlify Function Logs

1. Go to: https://app.netlify.com/sites/mealshareai/functions
2. Click on the `server` function
3. View the function logs for errors

**Look for:**

- MongoDB connection errors
- Missing environment variables
- Passport authentication errors

---

## ✅ Step 5: Verify Google OAuth Configuration

Go to: https://console.cloud.google.com/apis/credentials

1. Click your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, verify you have:
   ```
   https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback
   ```
3. Under **Authorized JavaScript origins**, add:
   ```
   https://mealshareai.netlify.app
   ```

---

## 🔧 Common Fixes

### Fix 1: Function Not Building

If the function isn't building, check `netlify.toml`:

```toml
[build]
  command = "npm install && npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
  included_files = ["server/**/*"]
```

### Fix 2: Module Resolution Issues

If you get "Cannot find module" errors, ensure `package.json` has:

```json
{
  "type": "module",
  "dependencies": {
    "serverless-http": "^3.2.0",
    "express": "^5.2.1",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0"
  }
}
```

### Fix 3: Session Issues

Update `netlify/functions/server.ts` session config:

```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true, // Always true for production
      sameSite: "none", // Required for cross-site cookies
    },
  })
);
```

### Fix 4: CORS Issues

Ensure CORS is properly configured:

```typescript
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

---

## 🧪 Local Testing with Netlify CLI

Test your function locally before deploying:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link to your site
netlify link

# Run locally (this will use your .env file)
netlify dev
```

Visit: http://localhost:8888

This runs your site + functions locally exactly as Netlify would.

---

## 🚨 Emergency: Redeploy Everything

If nothing works:

```bash
# 1. Clear Netlify cache
# Go to: Site settings > Build & deploy > Clear cache and deploy site

# 2. Force a clean rebuild
git commit --allow-empty -m "Force clean rebuild"
git push origin main

# 3. Check if site is live
curl -I https://mealshareai.netlify.app

# 4. Check function status
curl https://mealshareai.netlify.app/.netlify/functions/server
```

---

## 📊 Checklist

- [ ] All environment variables set in Netlify
- [ ] Google OAuth has production callback URL
- [ ] Build completes successfully
- [ ] Function health check responds
- [ ] MongoDB connection works
- [ ] Auth redirect works
- [ ] No errors in function logs

---

## 🆘 Still Not Working?

### Check Browser Console:

Open DevTools (F12) and look for:

- CORS errors
- 404 errors
- Network tab shows request details

### Check Netlify Function Logs:

- Real-time logs: https://app.netlify.com/sites/mealshareai/functions/server
- Look for runtime errors, connection failures

### Test Individual Components:

1. **MongoDB Connection:**

   ```bash
   # Check if your MongoDB URI is accessible
   curl -X POST https://mealshareai.netlify.app/.netlify/functions/server/api/members
   ```

2. **Session Middleware:**

   ```bash
   curl -v -c cookies.txt https://mealshareai.netlify.app/.netlify/functions/server/auth/user
   ```

3. **Google OAuth:**
   - Visit: `https://mealshareai.netlify.app/.netlify/functions/server/auth/google`
   - Should redirect to Google
   - If it shows error, check Google Console settings

---

## 📝 Next Steps After Debugging

Once you identify the issue:

1. Fix the code locally
2. Test with `netlify dev`
3. Commit and push
4. Monitor the deployment
5. Test the live site
6. Check function logs for any runtime errors

---

## 💡 Pro Tips

1. **Use Netlify CLI for local testing** - it's the closest to production
2. **Check logs immediately after deployment** - errors show up right away
3. **Test one endpoint at a time** - easier to isolate issues
4. **Keep environment variables synced** - local `.env` should match Netlify
5. **Use the debug endpoint** - helps understand request routing

---

Need more help? Check:

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Serverless HTTP Docs](https://github.com/dougmoscrop/serverless-http)
- [Express.js Docs](https://expressjs.com/)
