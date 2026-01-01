# 🚀 Netlify Deployment Guide for MealShare AI

## ✅ Pre-Deployment Checklist

### 1. **Google OAuth Console Setup**

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and:

1. Select your project (or create one)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback
   ```
5. Save changes

### 2. **Netlify Environment Variables**

Go to your Netlify dashboard: **Site Settings** → **Environment Variables** and add:

```env
GEMINI_API_KEY=your-gemini-api-key-here
MONGODB_URI=your-mongodb-connection-string-here
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=https://mealshareai.netlify.app/.netlify/functions/server/auth/google/callback
SESSION_SECRET=generate-new-secret-using-crypto
NODE_ENV=production
CLIENT_URL=https://mealshareai.netlify.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-app-password-here
```

**⚠️ IMPORTANT**: Copy the actual values from your `.env` file. Never commit real credentials to Git!

#### 🔒 Generate New SESSION_SECRET

Run this command to generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `SESSION_SECRET` in Netlify.

### 3. **Deploy to Netlify**

#### Option A: From GitHub (Recommended)

1. Push your code to GitHub
2. In Netlify Dashboard:
   - Click **Add new site** → **Import an existing project**
   - Connect to GitHub and select your repository
   - Build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
     - **Functions directory**: `netlify/functions`
3. Click **Deploy site**

#### Option B: Manual Deploy

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## 🔍 Verify Deployment

### Test API Endpoints

1. **Health Check**:

   ```
   https://mealshareai.netlify.app/.netlify/functions/server/health
   ```

   Should return: `{"status": "ok", "message": "MealShare API is running on Netlify"}`

2. **Google Login**:
   - Visit: `https://mealshareai.netlify.app`
   - Click "Continue with Google"
   - Should redirect to Google OAuth
   - After authentication, should redirect back to your app

## 🐛 Troubleshooting

### Issue: OAuth Redirect to localhost

**Problem**: Clicking Google login redirects to `http://localhost:5000`

**Solution**:

- Verify `GOOGLE_CALLBACK_URL` in Netlify environment variables is set correctly
- Check Google Cloud Console has the production callback URL added
- Clear browser cache and cookies
- Redeploy the site

### Issue: CORS Errors

**Problem**: Browser shows CORS policy errors

**Solution**:

- Verify `CLIENT_URL` is set to `https://mealshareai.netlify.app` in Netlify
- Check that credentials are included in fetch requests: `credentials: 'include'`

### Issue: Session Not Persisting

**Problem**: User gets logged out on page refresh

**Solution**:

- Ensure `SESSION_SECRET` is set in Netlify environment variables
- Check that cookies are being set with `sameSite: 'none'` and `secure: true` in production
- Verify browser allows third-party cookies

### Issue: Database Connection Timeout

**Problem**: MongoDB connection fails

**Solution**:

- Verify `MONGODB_URI` is correct in Netlify
- Check MongoDB Atlas network access allows connections from anywhere (0.0.0.0/0)
- Verify MongoDB user has correct permissions

## 📝 Local Development

To run locally after deployment:

1. Copy `.env.local` to `.env`:

   ```bash
   cp .env.local .env
   ```

2. Start development server:

   ```bash
   npm run dev
   ```

3. Start backend server (in another terminal):

   ```bash
   npm run server
   ```

4. Visit: `http://localhost:3001`

## 🔐 Security Notes

- ✅ Never commit `.env` file with real credentials
- ✅ Use different `SESSION_SECRET` for production and development
- ✅ Keep `.env` in `.gitignore`
- ✅ Rotate secrets regularly
- ✅ Use environment-specific variables in Netlify

## 📚 Additional Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [MongoDB Atlas Security](https://docs.atlas.mongodb.com/security/)

## ✅ Deployment Complete

After following all steps:

1. ✅ Google OAuth configured with production URL
2. ✅ Netlify environment variables set
3. ✅ Code deployed to Netlify
4. ✅ API endpoints responding
5. ✅ Authentication working

Your MealShare AI app is now live at: **https://mealshareai.netlify.app** 🎉
