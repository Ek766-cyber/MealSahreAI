<div align="center">
</div>

# MealShare AI

> Automated expense tracking and AI reminders for your shared meals

## ✨ Features

- 🔐 **Google SSO Authentication** - Secure, password-less login
- 🗄️ **MongoDB Database** - Persistent data storage in MongoDB
- 📊 **Smart Expense Tracking** - Automatic meal cost calculations
- 🔄 **Google Sheets Sync** - Import data from spreadsheets
- 🤖 **AI-Powered Reminders** - Gemini AI generates payment reminders
- 👥 **Member Management** - Add and manage meal sharing contacts
- 📈 **Visual Dashboard** - Charts and analytics powered by Recharts

## 🚀 Quick Start

### Prerequisites

- **Node.js** v16 or higher
- **MongoDB** (local or Atlas)
- **Google OAuth Credentials** ([Get them here](https://console.cloud.google.com/apis/credentials))

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd MealSahreAI
   ```

2. **Install dependencies**

   ```bash
   yarn install
   # or
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:

   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   MONGODB_URI=mongodb://localhost:27017/mealshare
   SESSION_SECRET=your-random-secret-key
   ```

4. **Start MongoDB**

   ```bash
   # Ubuntu/Debian
   sudo systemctl start mongodb

   # macOS
   brew services start mongodb-community
   ```

5. **Run the application**

   **Terminal 1 - Backend:**

   ```bash
   yarn server
   ```

   **Terminal 2 - Frontend:**

   ```bash
   yarn dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173`

## 📖 Documentation

- **[Setup Guide](SETUP_GUIDE.md)** - Detailed setup instructions
- **[SSO & MongoDB Complete](SSO_MONGODB_COMPLETE.md)** - Implementation details
- **[Environment Variables](.env.example)** - Configuration template

## 🛠 Technology Stack

### Frontend

- **React** 19.2.3 with TypeScript
- **Vite** - Fast build tool
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling

### Backend

- **Express.js** - Web server
- **MongoDB** with Mongoose - Database
- **Passport.js** - Google OAuth authentication
- **TypeScript** - Type safety

### AI/ML

- **Google Gemini AI** - Reminder generation

## 📁 Project Structure

```
MealShareAI/
├── components/          # React components
│   ├── Login.tsx       # Google SSO login
│   ├── Dashboard.tsx   # Main dashboard
│   ├── MemberManager.tsx
│   └── ...
├── server/             # Backend API
│   ├── config/        # Database & auth config
│   ├── models/        # MongoDB schemas
│   ├── routes/        # API endpoints
│   ├── middleware/    # Auth middleware
│   └── server.ts      # Express server
├── services/          # Frontend services
│   ├── dbService.ts   # API calls
│   ├── geminiService.ts
│   └── sheetService.ts
└── types.ts           # TypeScript definitions
```

## 🔐 API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/user` - Get current user
- `POST /auth/logout` - Logout

### Members (Protected)

- `GET /api/members` - List members
- `POST /api/members` - Add member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

### Health

- `GET /health` - Server status

## 🧪 Development Scripts

```bash
# Frontend development
yarn dev              # Start Vite dev server

# Backend development
yarn server           # Start Express server with nodemon

# Production build
yarn build           # Build frontend
yarn build:server    # Build backend

# Helper scripts
./dev.sh setup       # Initial setup
./dev.sh start       # Start both servers
./dev.sh stop        # Stop all servers
```

## 🚢 Deployment

### Backend

1. Build server: `yarn build:server`
2. Set production environment variables
3. Deploy to your preferred platform (Heroku, Railway, etc.)
4. Update `GOOGLE_CALLBACK_URL` to production URL

### Frontend

1. Update `VITE_API_URL` in `.env.local`
2. Build: `yarn build`
3. Deploy to Vercel, Netlify, or similar

## 🔒 Security

- ✅ OAuth 2.0 authentication
- ✅ HTTP-only session cookies
- ✅ CORS protection
- ✅ Environment variable secrets
- ✅ User data isolation
- ✅ Protected API routes

**Production Checklist:**

- [ ] Use HTTPS
- [ ] Strong SESSION_SECRET
- [ ] MongoDB Atlas with IP whitelist
- [ ] Secure cookie settings
- [ ] Regular dependency updates
- [ ] Never commit `.env`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🎯 Roadmap

- [ ] Email notifications
- [ ] SMS reminders
- [ ] Expense history tracking
- [ ] Mobile app version
- [ ] Payment integration
- [ ] Multi-currency support

## 📞 Support

For detailed setup instructions and troubleshooting, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

For issues or questions, please create an issue in the repository.

---

View your app in AI Studio: https://ai.studio/apps/drive/1muFC0udK3cfgWBzHsA7E57sVfGsCoq8Q

Made with ❤️ by MealShare AI Team
