import serverless from 'serverless-http';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from '../../server/config/passport.js';
import { connectDB } from '../../server/config/database.js';
import authRoutes from '../../server/routes/auth.js';
import memberRoutes from '../../server/routes/members.js';
import notificationRoutes from '../../server/routes/notifications.js';
import sheetRoutes from '../../server/routes/sheet.js';

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB (with connection pooling for serverless)
let dbConnection: any = null;
const getDB = async () => {
  if (!dbConnection) {
    dbConnection = await connectDB();
  }
  return dbConnection;
};

// Initialize DB connection
getDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.URL || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Root health check (for /.netlify/functions/server)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MealShare API is running on Netlify',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasClientUrl: !!process.env.CLIENT_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID
    }
  });
});

// Debug route
app.get('/debug', (req, res) => {
  res.json({
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    headers: req.headers,
    query: req.query
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sheet', sheetRoutes);

// Health check (for backward compatibility)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MealShare API is running on Netlify',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export as serverless function
export const handler = serverless(app);
