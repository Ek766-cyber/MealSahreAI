# Environment Configuration Guide

This document explains how to configure the MealShare AI application for both local development and production deployment.

## Overview

The application uses environment variables to configure different API URLs for local and deployed environments. This allows the same codebase to work seamlessly in both contexts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Environment Detection                     │
│                                                              │
│  Local Dev           →    http://localhost:5000             │
│  Deployed/Production →    /.netlify/functions/server-cjs    │
│  (or custom URL)     →    https://your-api.com              │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### 1. `.env.local` (Local Development)

Used when running the app locally with `npm run dev`.

```env
VITE_API_URL=http://localhost:5000
GEMINI_API_KEY=your-gemini-key
MONGODB_URI=your-mongodb-uri
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 2. `.env.production` (Deployment)

Used when building for production with `npm run build`.

```env
VITE_API_URL=/.netlify/functions/server-cjs
```

For non-Netlify deployments, set to your deployed backend URL:

```env
VITE_API_URL=https://your-backend-api.com
```

### 3. `.env.example` (Template)

A template file showing all available environment variables. Copy this to `.env.local` to get started.

## API Configuration Module

The application uses a centralized configuration module at [config/api.ts](config/api.ts):

```typescript
import { getApiUrl } from "./config/api";

// Get the correct API URL for the current environment
const API_URL = getApiUrl();

// Use it in fetch calls
fetch(`${API_URL}/api/endpoint`, {
  /* ... */
});
```

### How it Works

The `getApiUrl()` function automatically detects the environment:

1. **Browser with Vite**: Uses `import.meta.env.VITE_API_URL`
2. **Node.js/SSR**: Uses `process.env.VITE_API_URL`
3. **Deployed (non-localhost)**: Returns `/.netlify/functions/server-cjs`
4. **Fallback**: Returns `http://localhost:5000`

## Setup Instructions

### Local Development

1. **Copy the environment template:**

   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials in `.env.local`:**
   - MongoDB connection string
   - Google OAuth credentials
   - Email service credentials
   - Gemini API key

3. **Ensure `VITE_API_URL` is set to localhost:**

   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Start the development servers:**

   ```bash
   # Terminal 1: Start backend
   npm run dev:server

   # Terminal 2: Start frontend
   npm run dev
   ```

5. **Verify the configuration:**
   - Frontend: http://localhost:3001
   - Backend: http://localhost:5000
   - Health check: http://localhost:5000/health

### Production Deployment (Netlify)

1. **Configure Netlify Environment Variables:**

   Go to Netlify Dashboard → Site Settings → Build & Deploy → Environment Variables

   Add the following variables:

   ```
   VITE_API_URL=/.netlify/functions/server-cjs
   GEMINI_API_KEY=your-gemini-key
   MONGODB_URI=your-mongodb-uri
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=https://your-site.netlify.app/auth/google/callback
   SESSION_SECRET=your-secure-secret
   CLIENT_URL=https://your-site.netlify.app
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

2. **Update Google OAuth Redirect URI:**
   - Go to Google Cloud Console
   - Add redirect URI: `https://your-site.netlify.app/auth/google/callback`

3. **Deploy:**
   ```bash
   yarn build
   netlify deploy --prod
   ```

### Production Deployment (Other Platforms)

1. **Set environment variables on your hosting platform:**

   ```
   VITE_API_URL=https://your-backend-api.com
   ```

2. **Update all other environment variables** as needed for your platform

3. **Build and deploy:**
   ```bash
   yarn build
   ```

## Troubleshooting

### Issue: API calls fail with CORS errors

**Solution:** Ensure your backend server allows requests from your frontend domain:

```typescript
// server/server.ts
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
```

### Issue: Authentication redirects to localhost

**Solution:** Update `GOOGLE_CALLBACK_URL` in your deployment environment variables:

```
GOOGLE_CALLBACK_URL=https://your-deployed-site.com/auth/google/callback
```

### Issue: Environment variables not loading

**Solution:**

1. Restart the development server after changing `.env` files
2. Clear browser cache
3. Verify file names: `.env.local` for dev, `.env.production` for build
4. Check that variables start with `VITE_` for client-side access

### Issue: Different behavior in dev vs production

**Solution:** Test with production build locally:

```bash
npm run build
npm run preview
```

## Environment Variable Naming

- **`VITE_*`**: Exposed to client-side code (use for API URLs, public keys)
- **Other variables**: Server-side only (use for secrets, database credentials)

⚠️ **Security Warning**: Never expose secrets in `VITE_*` variables! They are included in the client bundle.

## Verification

Run these checks to verify your setup:

### Local Development

```bash
# Check if backend is running
curl http://localhost:5000/health

# Check if frontend can reach backend
# Open browser console on http://localhost:3001
console.log(import.meta.env.VITE_API_URL)
# Should output: http://localhost:5000
```

### Production

```bash
# Check if deployed backend is accessible
curl https://your-site.netlify.app/.netlify/functions/server-cjs/health

# Check frontend console
# Navigate to: https://your-site.netlify.app
# Open browser console
console.log(import.meta.env.VITE_API_URL)
# Should output: /.netlify/functions/server-cjs
```

## Additional Resources

- [Vite Environment Variables Documentation](https://vitejs.dev/guide/env-and-mode.html)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)
- [Google OAuth Setup](https://console.cloud.google.com/apis/credentials)

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set correctly
3. Ensure both frontend and backend are running
4. Check server logs for detailed error messages
