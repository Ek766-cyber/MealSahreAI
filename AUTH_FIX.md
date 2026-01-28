# Authentication Fix for "Not authenticated" Error

## Problem

API calls were failing with "Not authenticated" error because sessions were not persisting in the serverless environment (Netlify Functions).

### Root Causes:

1. **In-memory sessions don't work in serverless** - Each function invocation is stateless
2. **Session data was lost** after authentication callback completed
3. **Cookies weren't properly configured** for cross-origin requests

## Solution Implemented

### 1. MongoDB Session Store

Changed from in-memory sessions to MongoDB-backed sessions using `connect-mongo`:

```javascript
store: MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  ttl: 24 * 60 * 60, // 1 day
  autoRemove: "native",
  touchAfter: 24 * 3600,
});
```

This ensures sessions persist across serverless function invocations.

### 2. Improved CORS Configuration

Updated CORS to properly handle credentials and specific origins:

```javascript
cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:5000",
    ].filter(Boolean);
    // ... validation logic
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["set-cookie"],
});
```

### 3. Enhanced Cookie Configuration

Improved cookie settings for better cross-origin support:

```javascript
cookie: {
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
}
```

## Required Steps

### 1. Install Dependencies

```bash
npm install connect-mongo
```

### 2. Update Environment Variables

Make sure these are set in your **Netlify Environment Variables** (not just local .env):

```bash
# MongoDB Connection
MONGODB_URI=your-mongodb-connection-string

# Session Secret (generate a secure random string)
SESSION_SECRET=your-secure-random-session-secret

# Client URL (your Netlify site URL)
CLIENT_URL=https://your-site.netlify.app

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-site.netlify.app/.netlify/functions/server-cjs/auth/google/callback

# Node Environment
NODE_ENV=production
```

### 3. Generate Secure Session Secret

Use this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Update Netlify Environment Variables

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add/Update the following:
   - `SESSION_SECRET` (use the generated value)
   - `CLIENT_URL` (your Netlify site URL)
   - `MONGODB_URI` (your MongoDB connection string)
   - `GOOGLE_CALLBACK_URL` (update to match your site)

### 5. Redeploy

After updating environment variables:

```bash
# Commit changes
git add .
git commit -m "Fix authentication with MongoDB session store"
git push

# Or trigger manual deploy in Netlify
```

## How It Works Now

1. **User clicks "Sign in with Google"** → Redirects to `/auth/google`
2. **Google authenticates** → Redirects to `/auth/google/callback`
3. **Session is created and saved to MongoDB** → Session persists across function calls
4. **Cookie is sent to client** with session ID
5. **Client includes cookie in subsequent requests** → `credentials: 'include'`
6. **Server retrieves session from MongoDB** → User is authenticated

## Testing

### Test Authentication Flow:

1. **Clear cookies** in your browser
2. **Go to login page** and sign in with Google
3. **Check Network tab**:
   - Look for `set-cookie` header in callback response
   - Verify cookie is sent in subsequent API requests
4. **Test protected endpoints**:
   ```bash
   # Should return user data
   curl -X GET https://your-site.netlify.app/.netlify/functions/server-cjs/auth/user \
     -H "Cookie: mealshare.sid=<your-session-cookie>" \
     --include
   ```

### Debug Checklist:

- [ ] `connect-mongo` package installed
- [ ] MongoDB URI is accessible from Netlify
- [ ] SESSION_SECRET is set in Netlify environment
- [ ] CLIENT_URL matches your Netlify site
- [ ] GOOGLE_CALLBACK_URL matches your Netlify function URL
- [ ] Cookies are being set (check browser DevTools → Application → Cookies)
- [ ] Requests include `credentials: 'include'`

## Common Issues & Solutions

### Issue: "Failed to connect to MongoDB"

**Solution**: Verify MongoDB URI is correct and accessible. Check MongoDB Atlas firewall settings (allow access from anywhere: 0.0.0.0/0 for Netlify).

### Issue: Cookies not being set

**Solution**:

- Ensure `credentials: true` in CORS config
- Verify CLIENT_URL matches the origin
- Check `sameSite: "none"` in production with `secure: true`

### Issue: Session exists but user not authenticated

**Solution**:

- Check if session is being saved: Add logging in callback
- Verify passport serialization/deserialization
- Clear old sessions: `db.sessions.deleteMany({})`

### Issue: CORS errors

**Solution**:

- Add actual Netlify URL to allowed origins
- Ensure `credentials: true` is set
- Check `exposedHeaders: ["set-cookie"]`

## Monitoring

Check MongoDB sessions collection to verify sessions are being created:

```javascript
// In MongoDB shell or Compass
db.sessions.find().limit(10).sort({ expires: -1 });
```

You should see sessions with:

- `_id`: Session ID
- `expires`: Expiration date
- `session`: Serialized session data with user info

## Rollback

If issues persist, you can temporarily revert by:

1. Removing `MongoStore` configuration
2. Reverting to basic session (though this won't work properly in serverless)
3. Check git history: `git log --oneline AUTH_FIX.md`

## Additional Improvements

Consider implementing:

1. **Redis session store** for better performance (if using Redis)
2. **JWT tokens** as an alternative to sessions
3. **Session cleanup cron job** to remove expired sessions
4. **Rate limiting** on authentication endpoints

## References

- [connect-mongo Documentation](https://www.npmjs.com/package/connect-mongo)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Express Session Documentation](https://www.npmjs.com/package/express-session)
- [Netlify Functions Environment Variables](https://docs.netlify.com/functions/environment-variables/)
