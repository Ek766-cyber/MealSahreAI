import serverless from 'serverless-http';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import configurations and routes
import passport from '../../server/config/passport.js';
import { connectDB } from '../../server/config/database.js';
import authRoutes from '../../server/routes/auth.js';
import memberRoutes from '../../server/routes/members.js';
import notificationRoutes from '../../server/routes/notifications.js';
import sheetRoutes from '../../server/routes/sheet.js';

const app = express();

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({ 
      error: 'Database connection failed', 
      message: 'Please check if MONGODB_URI is set in environment variables'
    });
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for serverless
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
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
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    path: req.path
  });
});

// Wrap with serverless-http with proper configuration
const handler = serverless(app, {
  basePath: '/.netlify/functions/server'
});

export { handler };
