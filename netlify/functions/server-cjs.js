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
  csvUrl: String,
  lastFetchTime: Date,
  syncedPeople: [{ type: Object }],
  sheetMealRate: Number,
  autoSyncEnabled: { type: Boolean, default: false },
  autoSyncTime: { type: String, default: "09:00" },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Member Schema
const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sheetName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique sheet names per user
memberSchema.index({ userId: 1, sheetName: 1 }, { unique: true });

const Member = mongoose.models.Member || mongoose.model("Member", memberSchema);

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

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
};

// ==================== API ROUTES ====================

// Member routes
app.get("/api/members", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const members = await Member.find({ userId }).sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

app.post("/api/members", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { sheetName, email, phone } = req.body;

    if (!sheetName || !email) {
      return res
        .status(400)
        .json({ error: "Sheet name and email are required" });
    }

    // Check if member with same sheetName already exists for this user
    const existingMember = await Member.findOne({
      userId,
      sheetName: { $regex: new RegExp(`^${sheetName}$`, "i") },
    });

    if (existingMember) {
      return res
        .status(400)
        .json({ error: "A member with this Sheet Name already exists" });
    }

    const newMember = new Member({
      userId,
      sheetName,
      email,
      phone: phone || null,
    });

    await newMember.save();
    res.status(201).json(newMember);
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

app.put("/api/members/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { sheetName, email, phone } = req.body;

    if (!sheetName || !email) {
      return res
        .status(400)
        .json({ error: "Sheet name and email are required" });
    }

    // Check if another member with same sheetName exists
    const existingMember = await Member.findOne({
      userId,
      sheetName: { $regex: new RegExp(`^${sheetName}$`, "i") },
      _id: { $ne: id },
    });

    if (existingMember) {
      return res
        .status(400)
        .json({ error: "A member with this Sheet Name already exists" });
    }

    const updatedMember = await Member.findOneAndUpdate(
      { _id: id, userId },
      { sheetName, email, phone: phone || null },
      { new: true, runValidators: true }
    );

    if (!updatedMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json(updatedMember);
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

app.delete("/api/members/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const deletedMember = await Member.findOneAndDelete({ _id: id, userId });

    if (!deletedMember) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json({ message: "Member deleted successfully" });
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: "Failed to delete member" });
  }
});

// Sheet configuration routes
app.get("/api/sheet/config", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select(
      "csvUrl lastFetchTime syncedPeople sheetMealRate autoSyncEnabled autoSyncTime"
    );

    res.json({
      csvUrl: user?.csvUrl || null,
      lastFetchTime: user?.lastFetchTime || null,
      syncedPeople: user?.syncedPeople || [],
      sheetMealRate: user?.sheetMealRate || null,
      autoSyncEnabled: user?.autoSyncEnabled || false,
      autoSyncTime: user?.autoSyncTime || "09:00",
    });
  } catch (error) {
    console.error("Error fetching sheet config:", error);
    res.status(500).json({ error: "Failed to fetch sheet configuration" });
  }
});

app.post("/api/sheet/config", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { csvUrl } = req.body;

    if (!csvUrl) {
      return res.status(400).json({ error: "CSV URL is required" });
    }

    // Validate URL format
    try {
      new URL(csvUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.csvUrl = csvUrl;
    await user.save();

    res.json({ message: "CSV URL saved successfully", csvUrl });
  } catch (error) {
    console.error("Error saving CSV URL:", error);
    res.status(500).json({ error: "Failed to save CSV URL" });
  }
});

app.post("/api/sheet/save-data", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { syncedPeople, sheetMealRate } = req.body;

    if (!syncedPeople || !Array.isArray(syncedPeople)) {
      return res.status(400).json({ error: "Invalid synced people data" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.syncedPeople = syncedPeople;
    user.sheetMealRate = sheetMealRate;
    user.lastFetchTime = new Date();
    await user.save();

    res.json({
      message: "Data saved successfully",
      lastFetchTime: user.lastFetchTime,
    });
  } catch (error) {
    console.error("Error saving sheet data:", error);
    res.status(500).json({ error: "Failed to save sheet data" });
  }
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

// Export handler with basePath to strip Netlify function path
exports.handler = serverless(app, {
  basePath: "/.netlify/functions/server-cjs",
});
