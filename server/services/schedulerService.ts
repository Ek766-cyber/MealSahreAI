import cron from 'node-cron';
import User from '../models/User.js';
import Member from '../models/Member.js';
import { emailService } from '../../services/emailService.js';
import { generateReminders } from '../../services/geminiService.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

interface ScheduledJob {
  userId: string;
  task: cron.ScheduledTask;
  type: 'notification' | 'sync'; // Type of scheduled job
}

class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();

  /**
   * Initialize schedulers for all users who have auto features enabled
   */
  async initializeAllSchedulers() {
    console.log('🕐 Initializing notification and sync schedulers...');
    
    try {
      // Initialize notification schedulers
      const notificationUsers = await User.find({
        'notificationConfig.isEnabled': true,
        'notificationConfig.autoSend': true,
        'notificationConfig.emailEnabled': true
      });

      console.log(`📋 Found ${notificationUsers.length} users with auto-send enabled`);

      for (const user of notificationUsers) {
        await this.startNotificationScheduler(user._id.toString());
      }

      // Initialize sync schedulers
      const syncUsers = await User.find({
        autoSyncEnabled: true,
        csvUrl: { $exists: true, $ne: null }
      });

      console.log(`📋 Found ${syncUsers.length} users with auto-sync enabled`);

      for (const user of syncUsers) {
        await this.startSyncScheduler(user._id.toString());
      }
    } catch (error) {
      console.error('❌ Error initializing schedulers:', error);
    }
  }

  /**
   * Start or restart notification scheduler for a specific user
   */
  async startNotificationScheduler(userId: string) {
    try {
      // Stop existing notification job if any
      this.stopScheduler(userId, 'notification');

      const user = await User.findById(userId);
      if (!user || !user.notificationConfig) {
        console.warn(`⚠️ User ${userId} not found or no notification config`);
        return;
      }

      const { scheduledTime, isEnabled, autoSend, emailEnabled, threshold, tone } = user.notificationConfig;

      // Only start if all conditions are met
      if (!isEnabled || !autoSend || !emailEnabled) {
        console.log(`⏸️ Notification scheduler conditions not met for user ${user.email}`);
        return;
      }

      // Parse scheduled time (format: "HH:MM")
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      
      // Create cron expression: "minute hour * * *" (daily at specified time)
      const cronExpression = `${minutes} ${hours} * * *`;

      console.log(`⏰ Setting up notification scheduler for ${user.email} at ${scheduledTime} (cron: ${cronExpression})`);

      // Create scheduled task
      const task = cron.schedule(cronExpression, async () => {
        console.log(`\n🔔 Running scheduled notification task for ${user.email} at ${new Date().toLocaleString()}`);
        await this.runNotificationTask(userId);
      }, {
        scheduled: true,
        timezone: 'America/New_York' // You can make this configurable per user
      });

      // Store the job
      this.jobs.set(`${userId}-notification`, { userId, task, type: 'notification' });

      console.log(`✅ Notification scheduler started for user ${user.email} - Will run daily at ${scheduledTime}`);
    } catch (error) {
      console.error(`❌ Error starting notification scheduler for user ${userId}:`, error);
    }
  }

  /**
   * Start or restart sync scheduler for a specific user
   */
  async startSyncScheduler(userId: string) {
    try {
      // Stop existing sync job if any
      this.stopScheduler(userId, 'sync');

      const user = await User.findById(userId);
      if (!user) {
        console.warn(`⚠️ User ${userId} not found`);
        return;
      }

      const { autoSyncEnabled, autoSyncTime, csvUrl } = user;

      // Only start if enabled and CSV URL is configured
      if (!autoSyncEnabled || !csvUrl) {
        console.log(`⏸️ Sync scheduler conditions not met for user ${user.email}`);
        return;
      }

      // Parse scheduled time (format: "HH:MM")
      const [hours, minutes] = (autoSyncTime || '09:00').split(':').map(Number);
      
      // Create cron expression: "minute hour * * *" (daily at specified time)
      const cronExpression = `${minutes} ${hours} * * *`;

      console.log(`⏰ Setting up sync scheduler for ${user.email} at ${autoSyncTime} (cron: ${cronExpression})`);

      // Create scheduled task
      const task = cron.schedule(cronExpression, async () => {
        console.log(`\n🔄 Running scheduled sync task for ${user.email} at ${new Date().toLocaleString()}`);
        await this.runSyncTask(userId);
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });

      // Store the job
      this.jobs.set(`${userId}-sync`, { userId, task, type: 'sync' });

      console.log(`✅ Sync scheduler started for user ${user.email} - Will run daily at ${autoSyncTime}`);
    } catch (error) {
      console.error(`❌ Error starting sync scheduler for user ${userId}:`, error);
    }
  }

  /**
   * Stop scheduler for a specific user and type
   */
  stopScheduler(userId: string, type: 'notification' | 'sync') {
    const jobKey = `${userId}-${type}`;
    const job = this.jobs.get(jobKey);
    if (job) {
      job.task.stop();
      this.jobs.delete(jobKey);
      console.log(`⏹️ ${type} scheduler stopped for user ${userId}`);
    }
  }

  /**
   * Stop all schedulers for a user
   */
  stopAllSchedulersForUser(userId: string) {
    this.stopScheduler(userId, 'notification');
    this.stopScheduler(userId, 'sync');
  }

  /**
   * Execute the scheduled notification task
   */
  private async runNotificationTask(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ User ${userId} not found`);
        return;
      }

      const config = user.notificationConfig;
      if (!config) {
        console.error(`❌ No notification config for user ${user.email}`);
        return;
      }

      console.log(`📊 Fetching balances for ${user.email}...`);

      // Fetch fresh data from Google Sheets directly
      const balances = await this.fetchBalancesFromSheet();
      
      if (!balances || balances.length === 0) {
        console.warn(`⚠️ No balance data found for ${user.email}`);
        return;
      }

      console.log(`✅ Found ${balances.length} balances`);

      // Get meal rate from the first balance (they all should have the same rate)
      const mealRate = balances[0]?.mealRate || 50;

      // Generate AI reminders
      console.log(`🤖 Generating reminders with threshold: $${config.threshold}, tone: ${config.tone}`);
      const reminders = await generateReminders(
        balances,
        config.tone || 'friendly',
        mealRate,
        config.threshold || 100
      );

      console.log(`📝 Generated ${reminders.length} reminders`);

      if (reminders.length === 0) {
        console.log(`✅ No reminders needed - all balances are above threshold`);
        return;
      }

      // Send emails to each person
      let sent = 0;
      let failed = 0;

      for (const reminder of reminders) {
        try {
          // Look up member email
          let recipientEmail = '';
          
          const member = await Member.findOne({ 
            userId: user._id,
            sheetName: { $regex: new RegExp(`^${reminder.name}$`, 'i') }
          });

          if (member && member.email) {
            recipientEmail = member.email;
          } else {
            console.warn(`⚠️ No email found for ${reminder.name}`);
            failed++;
            continue;
          }

          console.log(`📧 Sending email to ${reminder.name} (${recipientEmail})...`);

          const success = await emailService.sendNotificationEmail(
            recipientEmail,
            reminder.name || 'Member',
            reminder.message || 'Please check your balance',
            reminder.amountOwed || 0
          );

          if (success) {
            sent++;
            console.log(`✅ Email sent to ${reminder.name}`);
          } else {
            failed++;
            console.error(`❌ Failed to send email to ${reminder.name}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failed++;
          console.error(`❌ Error sending email to ${reminder.name}:`, error);
        }
      }

      console.log(`\n📊 Scheduled task complete for ${user.email}:`);
      console.log(`   ✅ Sent: ${sent}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   📋 Total: ${reminders.length}\n`);

    } catch (error) {
      console.error(`❌ Error running scheduled task for user ${userId}:`, error);
    }
  }

  /**
   * Execute the scheduled sync task
   */
  private async runSyncTask(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ User ${userId} not found`);
        return;
      }

      if (!user.csvUrl) {
        console.error(`❌ No CSV URL configured for user ${user.email}`);
        return;
      }

      console.log(`🔄 Fetching data from Google Sheets for ${user.email}...`);
      console.log(`📋 CSV URL: ${user.csvUrl}`);

      // Fetch data from the configured CSV URL
      const response = await fetch(user.csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }

      const csvText = await response.text();
      
      // Use the same CSV parsing logic as the frontend
      const { people, extractedRate } = this.parseCSV(csvText);

      if (people.length === 0) {
        console.warn(`⚠️ No people found in CSV for ${user.email}`);
        return;
      }

      // Save synced data to user
      user.syncedPeople = people;
      user.sheetMealRate = extractedRate || null;
      user.lastFetchTime = new Date();
      await user.save();

      console.log(`✅ Auto-sync complete for ${user.email}:`);
      console.log(`   📊 People synced: ${people.length}`);
      console.log(`   💰 Meal rate: $${extractedRate || 'N/A'}`);
      console.log(`   ⏰ Last sync: ${user.lastFetchTime.toLocaleString()}\n`);

    } catch (error) {
      console.error(`❌ Error running sync task for user ${userId}:`, error);
    }
  }

  /**
   * Parse CSV using the same logic as the frontend
   */
  private parseCSV(csvText: string): { people: any[]; extractedRate?: number } {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return { people: [] };

    let extractedRate: number | undefined;
    const mealCounts = new Map<string, number>();
    let gridHeaderRowIndex = -1;
    const columnToNameMap = new Map<number, string>();

    // PASS 1: Global Scan for Rate & Grid Structure
    for (let r = 0; r < lines.length; r++) {
      const rowRaw = lines[r];
      const cells = rowRaw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      const lowerCells = cells.map(c => c.toLowerCase());

      // Find Mil Rate
      const rateIdx = lowerCells.findIndex(c => c === 'mil rate' || c === 'meal rate' || c === 'rate');
      if (rateIdx !== -1 && rateIdx + 1 < cells.length) {
        const val = parseFloat(cells[rateIdx + 1]);
        if (!isNaN(val) && val > 0) extractedRate = val;
      }

      // Identify Meal Grid Header
      if (lowerCells[0] === 'date') {
        let validNames = 0;
        cells.forEach((cell, idx) => {
          if (idx > 0 && cell && cell.toLowerCase() !== 'joma' && cell.toLowerCase() !== 'total' && cell.toLowerCase() !== 'tot / day') {
            columnToNameMap.set(idx, cell);
            validNames++;
          }
        });
        
        if (validNames > 1) {
          gridHeaderRowIndex = r;
        }
      }

      // Capture Totals from Grid
      if (gridHeaderRowIndex !== -1 && r > gridHeaderRowIndex && lowerCells[0] === 'total') {
        columnToNameMap.forEach((name, colIdx) => {
          if (colIdx < cells.length) {
            const val = parseFloat(cells[colIdx]);
            if (!isNaN(val)) {
              if (!mealCounts.has(name.toLowerCase())) {
                mealCounts.set(name.toLowerCase(), val);
              }
            }
          }
        });
      }
    }

    // PASS 2: Parse Summary Table & Merge
    for (let r = 0; r < lines.length; r++) {
      const rowRaw = lines[r];
      const cells = rowRaw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      const lowerCells = cells.map(c => c.toLowerCase());

      const nameIdx = lowerCells.findIndex(c => c.includes('meal details') || c === 'name');
      
      if (nameIdx !== -1) {
        const costIdx = lowerCells.findIndex((c, idx) => idx > nameIdx && (c === 'cost' || c.includes('total cost')));
        const balanceIdx = lowerCells.findIndex((c, idx) => idx > nameIdx && (c.includes('available') || c.includes('balance')));

        if (costIdx !== -1 && balanceIdx !== -1) {
          const people: any[] = [];
          
          for (let i = r + 1; i < lines.length; i++) {
            const dataRow = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            if (dataRow.length <= Math.max(nameIdx, costIdx, balanceIdx)) break;

            const name = dataRow[nameIdx];
            if (!name || name.toLowerCase().includes('total') || name.toLowerCase() === 'check') break;

            const costStr = dataRow[costIdx];
            const balanceStr = dataRow[balanceIdx];

            if (costStr === '' && balanceStr === '') break;

            const cost = parseFloat(costStr) || 0;
            const balance = parseFloat(balanceStr) || 0;

            let meals = 0;
            const gridMeals = mealCounts.get(name.toLowerCase());
            
            if (gridMeals !== undefined) {
              meals = gridMeals;
            } else if (extractedRate && extractedRate > 0) {
              meals = parseFloat((cost / extractedRate).toFixed(2));
            }

            people.push({
              id: `sheet-summary-${i}`,
              name: name,
              email: '',
              meals: meals, 
              contribution: cost + balance,
              customBalance: balance
            });
          }
          
          if (people.length > 0) {
            return { people, extractedRate };
          }
        }
      }
    }

    return { people: [] };
  }

  /**
   * Fetch balances directly from Google Sheets (server-side)
   */
  private async fetchBalancesFromSheet() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID not configured');
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A:Z',
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        return [];
      }

      const headers = rows[0];
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase() === 'name');
      const balanceIndex = headers.findIndex((h: string) => h.toLowerCase() === 'balance');
      const mealRateIndex = headers.findIndex((h: string) => h.toLowerCase().includes('meal') && h.toLowerCase().includes('rate'));

      const balances = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = row[nameIndex];
        const balance = parseFloat(row[balanceIndex]) || 0;
        const mealRate = parseFloat(row[mealRateIndex]) || 50;

        if (name) {
          balances.push({
            personId: `person-${i}`,
            name,
            balance,
            mealRate
          });
        }
      }

      return balances;
    } catch (error) {
      console.error('Error fetching from Google Sheets:', error);
      return [];
    }
  }

  /**
   * Get status of all active schedulers
   */
  getSchedulerStatus() {
    const status = Array.from(this.jobs.entries()).map(([userId, job]) => ({
      userId,
      isRunning: job.task.getStatus() !== 'stopped'
    }));

    return {
      total: this.jobs.size,
      schedulers: status
    };
  }

  /**
   * Manually trigger a scheduled task (for testing)
   */
  async triggerManualNotification(userId: string) {
    console.log(`🔧 Manual notification trigger for user ${userId}`);
    await this.runNotificationTask(userId);
  }

  /**
   * Manually trigger a sync task (for testing)
   */
  async triggerManualSync(userId: string) {
    console.log(`🔧 Manual sync trigger for user ${userId}`);
    await this.runSyncTask(userId);
  }
}

export const schedulerService = new SchedulerService();
