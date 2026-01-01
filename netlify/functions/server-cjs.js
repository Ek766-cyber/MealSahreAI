const serverless = require("serverless-http");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Load environment variables
dotenv.config();

const app = express();

// MongoDB connection with caching
let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log("✅ Using cached MongoDB connection");
    return cachedConnection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("📡 Connecting to MongoDB...");

    mongoose.set("strictQuery", false);

    // Simpler connection options for serverless compatibility
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    });

    cachedConnection = connection;
    console.log("✅ MongoDB Connected Successfully");
    return connection;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    cachedConnection = null;
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  email: String,
  name: String,
  photoURL: String,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Configure Passport
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "/.netlify/functions/server-cjs/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          user.lastLogin = new Date();
          user = await user.save();
          return done(null, user);
        }

        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          photoURL: profile.photos?.[0]?.value,
          createdAt: new Date(),
          lastLogin: new Date(),
        });

        done(null, newUser);
      } catch (error) {
        done(error, undefined);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503).json({
      error: "Database unavailable",
      message: error.message,
    });
  }
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  console.log(`Original URL: ${req.originalUrl}`);
  next();
});

// Routes
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "MealShare API is running on Netlify (CommonJS)",
    timestamp: new Date().toISOString(),
    env: {
      hasMongoUri: !!process.env.MONGODB_URI,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    },
  });
});

// Debug route
app.get("/debug", (req, res) => {
  res.json({
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    method: req.method,
  });
});

// Auth routes
app.get("/auth/google", (req, res, next) => {
  console.log("Google auth route hit");
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

app.get(
  "/auth/google/callback",
  (req, res, next) => {
    console.log("Google callback route hit");
    passport.authenticate("google", { failureRedirect: "/" })(req, res, next);
  },
  (req, res) => {
    console.log("Auth successful, redirecting...");
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/dashboard`);
  }
);

app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Catch-all route for debugging
app.use((req, res, next) => {
  console.log("Unmatched route:", req.method, req.path);
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
    message: "This route does not exist on the server",
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

// Export handler with binary support and base path stripping
exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
  request: (request) => {
    // Strip the base path from the URL
    if (request.path && request.path.startsWith('/.netlify/functions/server-cjs')) {
      request.path = request.path.replace('/.netlify/functions/server-cjs', '');
    }
    if (!request.path || request.path === '') {
      request.path = '/';
    }
    return request;
  }
});
