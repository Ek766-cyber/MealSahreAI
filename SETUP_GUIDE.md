# MealShare AI - Complete Setup Guide

## Overview

MealShare AI is a meal expense tracking application with Google SSO authentication and MongoDB database integration.

## Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Google OAuth Credentials** (from Google Cloud Console)

---

## Step 1: Install MongoDB

### Option A: Local MongoDB Installation

**Ubuntu/Debian:**

```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Download and install from https://www.mongodb.com/try/download/community

### Option B: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update `.env` with your Atlas connection string

---

## Step 2: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client IDs**
5. Configure consent screen if prompted
6. For **Application type**, select **Web application**
7. Add authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback`
   - (Add production URL when deploying)
8. Copy your **Client ID** and **Client Secret**

---

## Step 3: Configure Environment Variables

Update the `.env` file in the project root:

```env
GEMINI_API_KEY=your-gemini-api-key

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/mealshare
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mealshare

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Session Configuration
SESSION_SECRET=change-this-to-a-random-string-in-production

# Server Configuration
PORT=5000
NODE_ENV=development

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

Update `.env.local` for Vite frontend:

```env
VITE_API_URL=http://localhost:5000
```

---

## Step 4: Install Dependencies

```bash
yarn install
# or
npm install
```

---

## Step 5: Run the Application

### Terminal 1: Start Backend Server

```bash
yarn server
# or
npm run server
```

The server will start on `http://localhost:5000`

### Terminal 2: Start Frontend Development Server

```bash
yarn dev
# or
npm run dev
```

The frontend will start on `http://localhost:5173`

---

## Step 6: Test the Application

1. Open your browser to `http://localhost:5173`
2. Click **Continue with Google**
3. Sign in with your Google account
4. You should be redirected back to the app and logged in

---

## Features

### ✅ Completed Features

- **Google OAuth SSO**: Secure authentication with Google
- **MongoDB Integration**: All user and member data stored in MongoDB
- **User Management**: Automatic user creation and session handling
- **Member Management**: CRUD operations for meal sharing members
- **Persistent Sessions**: Sessions stored securely
- **Protected Routes**: API endpoints protected with authentication

### Data Models

**User Schema:**

```typescript
{
  googleId: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
}
```

**Member Schema:**

```typescript
{
  userId: ObjectId;  // Reference to User
  sheetName: string; // Name as it appears in Google Sheet
  email: string;     // Contact email
  phone?: string;    // Optional phone number
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/user` - Get current user
- `POST /auth/logout` - Logout user

### Members (Protected)

- `GET /api/members` - Get all members
- `POST /api/members` - Add new member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Health Check

- `GET /health` - Server health status

---

## Project Structure

```
MealShareAI/
├── server/
│   ├── config/
│   │   ├── database.ts       # MongoDB connection
│   │   └── passport.ts       # Passport Google OAuth config
│   ├── models/
│   │   ├── User.ts          # User schema
│   │   └── Member.ts        # Member schema
│   ├── routes/
│   │   ├── auth.ts          # Authentication routes
│   │   └── members.ts       # Member CRUD routes
│   ├── middleware/
│   │   └── auth.ts          # Auth middleware
│   └── server.ts            # Express server setup
├── components/
│   ├── Login.tsx            # Google SSO login
│   ├── Dashboard.tsx        # Main dashboard
│   ├── MemberManager.tsx    # Member management
│   └── ...
├── services/
│   ├── dbService.ts         # API calls to backend
│   ├── geminiService.ts     # AI integration
│   └── sheetService.ts      # Google Sheets sync
├── .env                     # Backend environment variables
├── .env.local              # Frontend environment variables
└── package.json
```

---

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `sudo systemctl status mongodb`
- Check connection string in `.env`
- For Atlas, ensure IP whitelist is configured

### Google OAuth Issues

- Verify Client ID and Secret in `.env`
- Check authorized redirect URIs in Google Console
- Ensure `http://localhost:5000/auth/google/callback` is added

### CORS Issues

- Verify `CLIENT_URL` in `.env` matches your frontend URL
- Check browser console for specific CORS errors

### Session Issues

- Clear browser cookies
- Restart the backend server
- Generate a new `SESSION_SECRET`

---

## Production Deployment

### Backend

1. Build server: `yarn build:server`
2. Set `NODE_ENV=production`
3. Update `GOOGLE_CALLBACK_URL` to production URL
4. Use strong `SESSION_SECRET`
5. Enable HTTPS and set `secure: true` for cookies
6. Use MongoDB Atlas or managed MongoDB

### Frontend

1. Build: `yarn build`
2. Update `VITE_API_URL` to production backend URL
3. Deploy to Vercel, Netlify, or similar

---

## Security Notes

⚠️ **Important:**

- Never commit `.env` file to version control
- Use strong, random session secrets in production
- Enable HTTPS in production
- Regularly update dependencies
- Use MongoDB Atlas with IP whitelisting for production

---

## Next Steps

- [ ] Add email notifications for reminders
- [ ] Implement SMS notifications
- [ ] Add expense history tracking
- [ ] Create mobile app version
- [ ] Add payment integration

---

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License - see LICENSE file for details
