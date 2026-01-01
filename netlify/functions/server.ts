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

// Load environment variables first
dotenv.config();

const app = express();

// Connect to MongoDB on cold start
let dbConnected = false;
const ensureDB = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (error) {
    res.status(503).json({ 
      error: 'Database unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
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
// Routes - will be loaded after initialization
app.use('/auth', (req, res, next) => {
  if (authRoutes) authRoutes(req, res, next);
  else res.status(503).json({ error: 'Routes not initialized' });
});

app.use('/api/members', (req, res, next) => {
// Routes
app.use('/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sheet', sheetRoutes);.use('/api/sheet', sheetRoutes);

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
