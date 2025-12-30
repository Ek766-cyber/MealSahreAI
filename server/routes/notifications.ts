import express from 'express';
import { emailService } from '../../services/emailService.js';
import { isAuthenticated } from '../middleware/auth.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import { schedulerService } from '../services/schedulerService.js';

const router = express.Router();

interface SendEmailRequest {
  personId?: string;
  email?: string;
  name: string;
  message: string;
  amountOwed?: number;
}

// Send email notification to a specific user
router.post('/send-email', isAuthenticated, async (req, res) => {
  try {
    const { personId, email, name, message, amountOwed } = req.body as SendEmailRequest;

    console.log('📧 Send email request:', { personId, name, email, amountOwed });

    if (!message || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name and message' 
      });
    }

    let recipientEmail = email;

    // If personId is provided, look up the member's email
    if (!recipientEmail) {
      // Try to find member by sheetName (case-insensitive)
      const member = await Member.findOne({ 
        userId: (req.user as any)._id,
        sheetName: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      console.log('🔍 Member lookup result:', member ? `Found: ${member.email}` : 'Not found');

      if (member) {
        recipientEmail = member.email;
      }
    }

    if (!recipientEmail) {
      console.warn(`⚠️ No email found for member: ${name}`);
      return res.status(400).json({ 
        success: false, 
        error: `No email address found for member "${name}". Please add them in Member Manager.` 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email address format' 
      });
    }

    console.log(`📮 Sending email to: ${recipientEmail}`);

    const success = await emailService.sendNotificationEmail(
      recipientEmail,
      name,
      message,
      amountOwed
    );

    if (success) {
      console.log(`✅ Email sent successfully to ${recipientEmail}`);
      res.json({ 
        success: true, 
        message: `Email sent successfully to ${recipientEmail}` 
      });
    } else {
      console.error(`❌ Failed to send email to ${recipientEmail}`);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send email. Check server logs for details.' 
      });
    }
  } catch (error) {
    console.error('Error in /send-email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while sending email' 
    });
  }
});

// Send batch emails
router.post('/send-batch-emails', isAuthenticated, async (req, res) => {
  try {
    const { notifications } = req.body as { notifications: SendEmailRequest[] };

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No notifications provided' 
      });
    }

    console.log(`📧 Batch send request for ${notifications.length} notifications`);

    const results = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const notification of notifications) {
      try {
        let recipientEmail = notification.email;

        // Look up email if not provided
        if (!recipientEmail) {
          const member = await Member.findOne({ 
            userId: (req.user as any)._id,
            sheetName: { $regex: new RegExp(`^${notification.name}$`, 'i') }
          });

          if (member) {
            recipientEmail = member.email;
          }
        }

        if (!recipientEmail) {
          results.failed++;
          results.errors.push(`No email found for ${notification.name}`);
          console.warn(`⚠️ No email found for ${notification.name}`);
          continue;
        }

        console.log(`📮 Sending to ${notification.name} (${recipientEmail})`);

        const success = await emailService.sendNotificationEmail(
          recipientEmail,
          notification.name,
          notification.message,
          notification.amountOwed
        );

        if (success) {
          results.sent++;
          console.log(`✅ Sent to ${notification.name}`);
        } else {
          results.failed++;
          results.errors.push(`Failed to send email to ${notification.name}`);
          console.error(`❌ Failed to send to ${notification.name}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.failed++;
        results.errors.push(`Error sending to ${notification.name}: ${error}`);
        console.error(`❌ Error sending to ${notification.name}:`, error);
      }
    }

    console.log(`📊 Batch send complete: ${results.sent} sent, ${results.failed} failed`);

    res.json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('Error in /send-batch-emails:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while sending batch emails' 
    });
  }
});

// Test email configuration
router.get('/test-email', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const testEmail = user?.email;

    if (!testEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'No email address found for current user' 
      });
    }

    const success = await emailService.sendNotificationEmail(
      testEmail,
      user.name,
      'This is a test email from MealShare AI. If you received this, your email configuration is working correctly!',
      0
    );

    if (success) {
      res.json({ 
        success: true, 
        message: `Test email sent to ${testEmail}` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email. Check email configuration.' 
      });
    }
  } catch (error) {
    console.error('Error in /test-email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while sending test email' 
    });
  }
});

// Check email service status
router.get('/email-status', isAuthenticated, async (req, res) => {
  try {
    const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
    const isVerified = isConfigured ? await emailService.verifyConnection() : false;

    res.json({
      configured: !!isConfigured,
      verified: isVerified,
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || '587',
      user: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : 'Not configured'
    });
  } catch (error) {
    console.error('Error checking email status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check email status' 
    });
  }
});

// Get notification configuration
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;
    const user = await User.findById(userId).select('notificationConfig');
    
    const config = user?.notificationConfig || {
      scheduledTime: '18:00',
      threshold: 100,
      emailEnabled: false,
      autoSend: false,
      isEnabled: false,
      tone: 'friendly'
    };

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching notification config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notification configuration' 
    });
  }
});

// Save notification configuration
router.post('/config', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;
    const { scheduledTime, threshold, emailEnabled, autoSend, isEnabled, tone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Initialize notificationConfig if it doesn't exist
    if (!user.notificationConfig) {
      user.notificationConfig = {
        scheduledTime: '18:00',
        threshold: 100,
        emailEnabled: false,
        autoSend: false,
        isEnabled: false,
        tone: 'friendly'
      };
    }

    // Update only provided fields
    if (scheduledTime !== undefined) user.notificationConfig.scheduledTime = scheduledTime;
    if (threshold !== undefined) user.notificationConfig.threshold = threshold;
    if (emailEnabled !== undefined) user.notificationConfig.emailEnabled = emailEnabled;
    if (autoSend !== undefined) user.notificationConfig.autoSend = autoSend;
    if (isEnabled !== undefined) user.notificationConfig.isEnabled = isEnabled;
    if (tone !== undefined) user.notificationConfig.tone = tone;

    await user.save();

    console.log(`✅ Notification config saved for user ${user.email}:`, user.notificationConfig);

    // Restart or stop the scheduler based on the new configuration
    if (isEnabled && autoSend && emailEnabled) {
      await schedulerService.startNotificationScheduler(userId.toString());
      console.log(`🔄 Notification scheduler restarted for user ${user.email}`);
    } else {
      schedulerService.stopScheduler(userId.toString(), 'notification');
      console.log(`⏹️ Notification scheduler stopped for user ${user.email}`);
    }

    res.json({ 
      success: true, 
      message: 'Notification configuration saved successfully',
      config: user.notificationConfig
    });
  } catch (error) {
    console.error('Error saving notification config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save notification configuration' 
    });
  }
});

// Get scheduler status (for debugging)
router.get('/scheduler-status', isAuthenticated, async (req, res) => {
  try {
    const status = schedulerService.getSchedulerStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get scheduler status' 
    });
  }
});

// Manually trigger scheduled task (for testing)
router.post('/trigger-manual-run', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id.toString();
    
    console.log(`🔧 Manual notification trigger requested by user ${userId}`);
    
    // Run the task asynchronously
    schedulerService.triggerManualNotification(userId).catch(err => {
      console.error('Error in manual notification trigger:', err);
    });

    res.json({
      success: true,
      message: 'Notification task triggered manually. Check server logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering manual run:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger manual run' 
    });
  }
});

export default router;
