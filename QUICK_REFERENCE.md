# 🚀 MealShare AI - Quick Reference

## 📋 Prerequisites Checklist

- [ ] Node.js v16+ installed
- [ ] MongoDB installed and running
- [ ] Google OAuth credentials obtained
- [ ] Environment variables configured

---

## ⚡ Quick Commands

### First Time Setup

```bash
# 1. Install MongoDB (Ubuntu/Debian)
sudo apt-get install -y mongodb
sudo systemctl start mongodb

# 2. Install dependencies
yarn install

# 3. Configure .env file
cp .env.example .env
# Edit .env with your credentials

# 4. Run setup script (optional)
./setup.sh
```

### Daily Development

```bash
# Terminal 1: Backend
yarn server

# Terminal 2: Frontend
yarn dev
```

### Using Helper Script

```bash
./dev.sh setup    # First time setup
./dev.sh start    # Start both servers
./dev.sh stop     # Stop all servers
./dev.sh mongo    # Open MongoDB shell
```

---

## 🔑 Environment Variables

### Required in `.env`

```env
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
MONGODB_URI=mongodb://localhost:27017/mealshare
SESSION_SECRET=<random-string>
```

### Required in `.env.local`

```env
VITE_API_URL=http://localhost:5000
```

---

## 🌐 URLs

| Service        | URL                               | Notes           |
| -------------- | --------------------------------- | --------------- |
| Frontend       | http://localhost:5173             | Vite dev server |
| Backend API    | http://localhost:5000             | Express server  |
| Health Check   | http://localhost:5000/health      | Server status   |
| Google Console | https://console.cloud.google.com/ | Get OAuth creds |
| MongoDB        | mongodb://localhost:27017         | Local database  |

---

## 📡 API Quick Reference

### Auth Endpoints

```
GET  /auth/google                → Start OAuth flow
GET  /auth/google/callback       → OAuth redirect
GET  /auth/user                  → Get current user
POST /auth/logout                → Logout
```

### Member Endpoints (Protected)

```
GET    /api/members              → List all members
POST   /api/members              → Create member
PUT    /api/members/:id          → Update member
DELETE /api/members/:id          → Delete member
```

---

## 🗄️ Database Collections

### users

```javascript
{
  googleId: "string",
  email: "string",
  name: "string",
  photoURL: "string",
  createdAt: "date",
  lastLogin: "date"
}
```

### members

```javascript
{
  userId: "ObjectId",
  sheetName: "string",
  email: "string",
  phone: "string",
  createdAt: "date",
  updatedAt: "date"
}
```

---

## 🔧 Troubleshooting Quick Fixes

### MongoDB Not Running

```bash
sudo systemctl start mongodb    # Linux
brew services start mongodb-community    # macOS
```

### Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Clear All Data

```bash
# Stop servers
./dev.sh stop

# Clear MongoDB
mongosh mealshare --eval "db.dropDatabase()"

# Clear browser data
# Open DevTools → Application → Clear Storage
```

### Reset Everything

```bash
./dev.sh clean      # Remove node_modules and build files
yarn install        # Reinstall dependencies
```

---

## 📦 Package Scripts

```json
{
  "dev": "Start Vite dev server",
  "build": "Build frontend for production",
  "preview": "Preview production build",
  "server": "Start backend with nodemon",
  "server:prod": "Run production backend",
  "build:server": "Build backend TypeScript"
}
```

---

## 🎯 Common Tasks

### Add Google OAuth Credentials

1. https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect: `http://localhost:5000/auth/google/callback`
5. Copy ID and Secret to `.env`

### Check MongoDB Data

```bash
# Open MongoDB shell
mongosh mealshare

# List users
db.users.find().pretty()

# List members
db.members.find().pretty()

# Count documents
db.users.countDocuments()
db.members.countDocuments()
```

### View Logs

```bash
# Backend logs (if using nodemon)
# Check terminal output

# Frontend logs
# Check browser console (F12)
```

---

## 📚 Documentation Files

| File                      | Purpose                       |
| ------------------------- | ----------------------------- |
| `README.md`               | Main project overview         |
| `SETUP_GUIDE.md`          | Detailed setup instructions   |
| `SSO_MONGODB_COMPLETE.md` | Implementation details        |
| `.env.example`            | Environment variable template |
| `QUICK_REFERENCE.md`      | This file!                    |

---

## 🆘 Getting Help

1. Check `SETUP_GUIDE.md` for detailed instructions
2. Review `SSO_MONGODB_COMPLETE.md` for implementation details
3. Check browser console (F12) for frontend errors
4. Check terminal for backend errors
5. Verify MongoDB is running
6. Verify environment variables are set

---

## ✅ Health Check

### System Health

```bash
# Check MongoDB
sudo systemctl status mongodb

# Check Node version
node --version    # Should be v16+

# Check ports
lsof -i :5000     # Backend should be here
lsof -i :5173     # Frontend should be here
```

### Test API

```bash
# Health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"ok","message":"MealShare API is running","timestamp":"..."}
```

---

## 🎨 Tech Stack Summary

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Express + TypeScript + Passport.js
- **Database**: MongoDB + Mongoose
- **Auth**: Google OAuth 2.0
- **AI**: Google Gemini
- **Charts**: Recharts

---

**Last Updated**: Dec 2025
**Version**: 1.0.0

For more details, see the full documentation in `SETUP_GUIDE.md`
