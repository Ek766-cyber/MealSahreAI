// Netlify Scheduled Function - Runs every hour
// Schedule: 0 * * * * (every hour at minute 0)
// Configure schedule in Netlify dashboard: Site settings > Functions > scheduled-tasks

const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// MongoDB connection
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
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
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

memberSchema.index({ userId: 1, sheetName: 1 }, { unique: true });
const Member = mongoose.models.Member || mongoose.model("Member", memberSchema);

// Email Service
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
      console.log(`✅ Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return false;
    }
  }
}

const emailService = new EmailService();

// Gemini Service for generating reminders
async function generateReminders(balances, tone, mealRate, threshold) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not configured");
    return [];
  }

  const peopleNeedingReminders = balances.filter(
    (person) => person.balance < -threshold,
  );

  if (peopleNeedingReminders.length === 0) {
    console.log("✅ No reminders needed (all balances above threshold)");
    return [];
  }

  const prompt = `Generate payment reminder messages for these people. Keep each message brief (2-3 sentences max).
Tone: ${tone}
Meal rate: ৳${mealRate}
Threshold: ৳${threshold}

People:
${peopleNeedingReminders
  .map(
    (p) =>
      `- ${p.name}: owes ৳${Math.abs(p.balance)} (${p.totalMeals} meals, paid ৳${p.totalDeposit})`,
  )
  .join("\n")}

Return ONLY a JSON array with this exact format:
[{"name": "PersonName", "message": "brief reminder message here"}]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const reminders = JSON.parse(cleanText);

    return peopleNeedingReminders.map((person) => {
      const reminder = reminders.find(
        (r) => r.name.toLowerCase() === person.name.toLowerCase(),
      );
      return {
        personId: person.id,
        name: person.name,
        message:
          reminder?.message ||
          `Hi ${person.name}, you owe ৳${Math.abs(person.balance)}. Please add funds to cover your meal plan.`,
        amountOwed: Math.abs(person.balance),
      };
    });
  } catch (error) {
    console.error("❌ Error generating reminders:", error);
    return peopleNeedingReminders.map((person) => ({
      personId: person.id,
      name: person.name,
      message: `${person.name}, you owe ৳${Math.abs(person.balance)}. Please add funds to cover your meal plan.`,
      amountOwed: Math.abs(person.balance),
    }));
  }
}

// Sheet service to sync data
async function syncSheetData(user) {
  if (!user.csvUrl) {
    console.log(`⚠️ No CSV URL configured for user ${user.email}`);
    return null;
  }

  try {
    console.log(`📊 Syncing sheet data for user ${user.email}`);
    const response = await fetch(user.csvUrl);
    const csvText = await response.text();

    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    const syncedPeople = [];
    let mealRate = user.sheetMealRate || 50;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      if (row.Name && row.Name !== "Total") {
        const totalMeals = parseFloat(row["Total Meals"]) || 0;
        const totalDeposit = parseFloat(row["Total Deposit"]) || 0;
        const balance = totalDeposit - totalMeals * mealRate;

        syncedPeople.push({
          id: `sheet-summary-${i}`,
          name: row.Name,
          totalMeals,
          totalDeposit,
          balance,
          lastUpdated: new Date().toISOString(),
        });
      }

      if (row.Name === "Meal Rate" && row["Total Meals"]) {
        mealRate = parseFloat(row["Total Meals"]) || mealRate;
      }
    }

    user.syncedPeople = syncedPeople;
    user.sheetMealRate = mealRate;
    user.lastFetchTime = new Date();
    await user.save();

    console.log(
      `✅ Synced ${syncedPeople.length} people for user ${user.email}`,
    );
    return { syncedPeople, mealRate };
  } catch (error) {
    console.error(`❌ Error syncing sheet data for user ${user.email}:`, error);
    return null;
  }
}

// Main handler for scheduled tasks
exports.handler = async (event, context) => {
  console.log("🕐 Scheduled task triggered at", new Date().toISOString());

  try {
    await connectDB();

    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    console.log(`⏰ Current time: ${currentTime}`);

    // Find users with notification scheduled for this hour
    const notificationUsers = await User.find({
      "notificationConfig.isEnabled": true,
      "notificationConfig.autoSend": true,
      "notificationConfig.emailEnabled": true,
    });

    console.log(
      `📋 Found ${notificationUsers.length} users with auto-send enabled`,
    );

    for (const user of notificationUsers) {
      const [scheduledHour, scheduledMinute] =
        user.notificationConfig.scheduledTime.split(":").map(Number);

      // Check if current hour matches scheduled hour (triggers anytime within that hour)
      if (currentHour === scheduledHour) {
        console.log(
          `🔔 Processing notifications for user ${user.email} (scheduled: ${user.notificationConfig.scheduledTime}, current: ${currentTime})`,
        );

        // Sync data first
        const syncResult = await syncSheetData(user);
        if (!syncResult) {
          console.warn(`⚠️ Failed to sync data for user ${user.email}`);
          continue;
        }

        const { syncedPeople, mealRate } = syncResult;

        // Generate reminders
        const reminders = await generateReminders(
          syncedPeople,
          user.notificationConfig.tone || "friendly",
          mealRate,
          user.notificationConfig.threshold || 100,
        );

        console.log(`📧 Generated ${reminders.length} reminders`);

        // Send emails
        const members = await Member.find({ userId: user._id });
        let sentCount = 0;

        for (const reminder of reminders) {
          const member = members.find(
            (m) => m.sheetName.toLowerCase() === reminder.name.toLowerCase(),
          );

          if (member && member.email) {
            const success = await emailService.sendNotificationEmail(
              member.email,
              reminder.name,
              reminder.message,
              reminder.amountOwed,
            );
            if (success) sentCount++;
          } else {
            console.warn(`⚠️ No email found for member: ${reminder.name}`);
          }
        }

        console.log(
          `✅ Sent ${sentCount}/${reminders.length} emails for user ${user.email}`,
        );
      }
    }

    // Handle auto-sync for users
    const syncUsers = await User.find({
      autoSyncEnabled: true,
      csvUrl: { $exists: true, $ne: null },
    });

    console.log(`📋 Found ${syncUsers.length} users with auto-sync enabled`);

    for (const user of syncUsers) {
      const [scheduledHour, scheduledMinute = 0] = user.autoSyncTime
        .split(":")
        .map(Number);

      // Check if current hour matches scheduled hour (triggers anytime within that hour)
      if (currentHour === scheduledHour) {
        console.log(
          `🔄 Auto-syncing data for user ${user.email} (scheduled: ${user.autoSyncTime}, current: ${currentTime})`,
        );
        await syncSheetData(user);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Scheduled tasks completed",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("❌ Error in scheduled task:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
