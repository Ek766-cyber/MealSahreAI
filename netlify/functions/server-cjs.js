const serverless = require("serverless-http");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");

// Load environment variables
dotenv.config();

const app = express();

// MongoDB connection with caching
let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    mongoose.set("strictQuery", false);

    // Simpler connection options for serverless compatibility
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    });

    cachedConnection = connection;
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
  notificationConfig: {
    scheduledTime: { type: String, default: "18:00" },
    threshold: { type: Number, default: 100 },
    emailEnabled: { type: Boolean, default: false },
    autoSend: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: false },
    tone: { type: String, default: "friendly" },
  },
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
  },
);

// Compound index to ensure unique sheet names per user
memberSchema.index({ userId: 1, sheetName: 1 }, { unique: true });

const Member = mongoose.models.Member || mongoose.model("Member", memberSchema);

// ==================== EMAIL SERVICE ====================
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    const emailConfig = {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
    } else {
      console.warn(
        "⚠️  Email credentials not configured. Email service disabled.",
      );
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("❌ Email server connection failed:", error);
      return false;
    }
  }

  generateDefaultHTML(subject, text) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            <p style="white-space: pre-wrap;">${text}</p>
          </div>
          <div class="footer">
            <p>This is an automated message from MealShare AI</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendNotificationEmail(to, recipientName, message, amountOwed = 0) {
    if (!this.transporter) {
      console.error("❌ Email service not initialized");
      return false;
    }

    try {
      const subject =
        amountOwed > 0
          ? `MealShare Payment Reminder - ৳${amountOwed}`
          : "MealShare Notification";

      const mailOptions = {
        from: `"MealShare AI" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text: message,
        html: this.generateDefaultHTML(subject, message),
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  }
}

const emailService = new EmailService();

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
    },
  ),
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
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env.CLIENT_URL,
        "http://localhost:5173",
        "http://localhost:5000",
      ].filter(Boolean);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["set-cookie"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with MongoDB store
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "fallback-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: "native",
      touchAfter: 24 * 3600, // Lazy session update
      crypto: {
        secret:
          process.env.SESSION_SECRET ||
          "fallback-secret-key-change-in-production",
      },
    }),
    name: "mealshare.sid",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
    },
  }),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

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
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

app.get(
  "/auth/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { failureRedirect: "/" })(req, res, next);
  },
  (req, res) => {
    // Explicitly save the session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      res.redirect(`${clientUrl}/dashboard`);
    });
  },
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
      { new: true, runValidators: true },
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
      "csvUrl lastFetchTime syncedPeople sheetMealRate autoSyncEnabled autoSyncTime",
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

    res.json({
      success: true,
      message: "CSV URL saved successfully",
      csvUrl,
    });
  } catch (error) {
    console.error("Error saving CSV URL:", error);
    res.status(500).json({ error: "Failed to save CSV URL" });
  }
});

app.post("/api/sheet/save-data", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { people, sheetMealRate } = req.body;

    if (!people || !Array.isArray(people)) {
      return res.status(400).json({ error: "Invalid people data" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.syncedPeople = people;
    user.sheetMealRate = sheetMealRate;
    user.lastFetchTime = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Data saved successfully",
      peopleCount: people.length,
      lastFetchTime: user.lastFetchTime,
    });
  } catch (error) {
    console.error("Error saving sheet data:", error);
    res.status(500).json({ error: "Failed to save sheet data" });
  }
});

// Update last fetch time
app.post("/api/sheet/update-fetch-time", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.lastFetchTime = new Date();
    await user.save();

    res.json({
      success: true,
      lastFetchTime: user.lastFetchTime,
      message: "Fetch time updated successfully",
    });
  } catch (error) {
    console.error("Error updating fetch time:", error);
    res.status(500).json({ error: "Failed to update fetch time" });
  }
});

// Save auto-sync scheduler settings
app.post("/api/sheet/save-scheduler", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { autoSyncEnabled, autoSyncTime } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (autoSyncEnabled !== undefined) user.autoSyncEnabled = autoSyncEnabled;
    if (autoSyncTime !== undefined) user.autoSyncTime = autoSyncTime;
    await user.save();

    res.json({
      success: true,
      message: "Auto-sync settings saved successfully",
      autoSyncEnabled: user.autoSyncEnabled,
      autoSyncTime: user.autoSyncTime,
    });
  } catch (error) {
    console.error("Error saving auto-sync settings:", error);
    res.status(500).json({ error: "Failed to save auto-sync settings" });
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Send email notification
app.post("/api/notifications/send-email", isAuthenticated, async (req, res) => {
  try {
    const { personId, email, name, message, amountOwed } = req.body;

    if (!message || !name) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name and message",
      });
    }

    let recipientEmail = email;

    // If personId is provided, look up the member's email
    if (!recipientEmail) {
      const member = await Member.findOne({
        userId: req.user._id,
        sheetName: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (member) {
        recipientEmail = member.email;
      }
    }

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: `No email address found for member "${name}". Please add them in Member Manager.`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        error: "Invalid email address format",
      });
    }

    const success = await emailService.sendNotificationEmail(
      recipientEmail,
      name,
      message,
      amountOwed,
    );

    if (success) {
      res.json({
        success: true,
        message: `Email sent successfully to ${recipientEmail}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to send email. Check server logs for details.",
      });
    }
  } catch (error) {
    console.error("Error in /send-email:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while sending email",
    });
  }
});

// Check email service status
app.get(
  "/api/notifications/email-status",
  isAuthenticated,
  async (req, res) => {
    try {
      const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
      const isVerified = isConfigured
        ? await emailService.verifyConnection()
        : false;

      res.json({
        configured: !!isConfigured,
        verified: isVerified,
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: process.env.EMAIL_PORT || "587",
        user: process.env.EMAIL_USER
          ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, "$1***$2")
          : "Not configured",
      });
    } catch (error) {
      console.error("Error checking email status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check email status",
      });
    }
  },
);

// Get notification configuration
app.get("/api/notifications/config", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("notificationConfig");

    const config = user?.notificationConfig || {
      scheduledTime: "18:00",
      threshold: 100,
      emailEnabled: false,
      autoSend: false,
      isEnabled: false,
      tone: "friendly",
    };

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error fetching notification config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notification configuration",
    });
  }
});

// Save notification configuration
app.post("/api/notifications/config", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      scheduledTime,
      threshold,
      emailEnabled,
      autoSend,
      isEnabled,
      tone,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Initialize notificationConfig if it doesn't exist
    if (!user.notificationConfig) {
      user.notificationConfig = {
        scheduledTime: "18:00",
        threshold: 100,
        emailEnabled: false,
        autoSend: false,
        isEnabled: false,
        tone: "friendly",
      };
    }

    // Update only provided fields
    if (scheduledTime !== undefined)
      user.notificationConfig.scheduledTime = scheduledTime;
    if (threshold !== undefined) user.notificationConfig.threshold = threshold;
    if (emailEnabled !== undefined)
      user.notificationConfig.emailEnabled = emailEnabled;
    if (autoSend !== undefined) user.notificationConfig.autoSend = autoSend;
    if (isEnabled !== undefined) user.notificationConfig.isEnabled = isEnabled;
    if (tone !== undefined) user.notificationConfig.tone = tone;

    await user.save();

    res.json({
      success: true,
      message: "Notification configuration saved successfully",
      config: user.notificationConfig,
    });
  } catch (error) {
    console.error("Error saving notification config:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save notification configuration",
    });
  }
});

// Catch-all route for debugging
app.use((req, res, next) => {
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
