import express from 'express';
import User from '../models/User.js';
import { isAuthenticated } from '../middleware/auth.js';
import { schedulerService } from '../services/schedulerService.js';

const router = express.Router();

// Get user's sheet configuration
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;
    const user = await User.findById(userId).select('csvUrl lastFetchTime syncedPeople sheetMealRate autoSyncEnabled autoSyncTime');
    
    res.json({
      csvUrl: user?.csvUrl || null,
      lastFetchTime: user?.lastFetchTime || null,
      syncedPeople: user?.syncedPeople || [],
      sheetMealRate: user?.sheetMealRate || null,
      autoSyncEnabled: user?.autoSyncEnabled || false,
      autoSyncTime: user?.autoSyncTime || '09:00'
    });
  } catch (error) {
    console.error('Error fetching sheet config:', error);
    res.status(500).json({ error: 'Failed to fetch sheet configuration' });
  }
});

// Save/Update CSV URL
router.post('/config', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;
    const { csvUrl } = req.body;

    if (!csvUrl) {
      return res.status(400).json({ error: 'CSV URL is required' });
    }

    // Validate URL format
    try {
      new URL(csvUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.csvUrl = csvUrl;
    await user.save();

    console.log(`✅ CSV URL saved for user ${user.email}: ${csvUrl}`);

    res.json({ 
      success: true, 
      csvUrl: user.csvUrl,
      message: 'CSV URL saved successfully' 
    });
  } catch (error) {
    console.error('Error saving sheet config:', error);
    res.status(500).json({ error: 'Failed to save CSV URL' });
  }
});

// Update last fetch time (called after successful data fetch)
router.post('/update-fetch-time', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.lastFetchTime = new Date();
    await user.save();

    console.log(`✅ Last fetch time updated for user ${user.email}`);

    res.json({ 
      success: true, 
      lastFetchTime: user.lastFetchTime,
      message: 'Fetch time updated successfully' 
    });
  } catch (error) {
    console.error('Error updating fetch time:', error);
    res.status(500).json({ error: 'Failed to update fetch time' });
  }
});

// Delete CSV URL configuration
router.delete('/config', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.csvUrl = undefined;
    user.lastFetchTime = undefined;
    await user.save();

    console.log(`🗑️ CSV URL deleted for user ${user.email}`);

    res.json({ 
      success: true, 
      message: 'Sheet configuration deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting sheet config:', error);
    res.status(500).json({ error: 'Failed to delete sheet configuration' });
  }
});

// Save synced data (people and meal rate)
router.post('/save-data', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;
    const { people, sheetMealRate } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.syncedPeople = people || [];
    user.sheetMealRate = sheetMealRate || null;
    await user.save();

    console.log(`✅ Synced data saved for user ${user.email}: ${people?.length || 0} people, meal rate: ${sheetMealRate || 'null'}`);

    res.json({ 
      success: true, 
      message: 'Synced data saved successfully',
      peopleCount: people?.length || 0
    });
  } catch (error) {
    console.error('Error saving synced data:', error);
    res.status(500).json({ error: 'Failed to save synced data' });
  }
});

// Save auto-sync scheduler settings
router.post('/save-scheduler', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id;
    const { autoSyncEnabled, autoSyncTime } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (autoSyncEnabled !== undefined) user.autoSyncEnabled = autoSyncEnabled;
    if (autoSyncTime !== undefined) user.autoSyncTime = autoSyncTime;
    await user.save();

    console.log(`✅ Auto-sync settings saved for user ${user.email}: enabled=${user.autoSyncEnabled}, time=${user.autoSyncTime}`);

    // Start or stop the sync scheduler based on the new configuration
    if (user.autoSyncEnabled && user.csvUrl) {
      await schedulerService.startSyncScheduler(userId.toString());
      console.log(`🔄 Sync scheduler started for user ${user.email}`);
    } else {
      schedulerService.stopScheduler(userId.toString(), 'sync');
      console.log(`⏹️ Sync scheduler stopped for user ${user.email}`);
    }

    res.json({ 
      success: true, 
      message: 'Auto-sync settings saved successfully',
      autoSyncEnabled: user.autoSyncEnabled,
      autoSyncTime: user.autoSyncTime
    });
  } catch (error) {
    console.error('Error saving auto-sync settings:', error);
    res.status(500).json({ error: 'Failed to save auto-sync settings' });
  }
});

// Manually trigger sync task (for testing)
router.post('/trigger-manual-sync', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)._id.toString();
    
    console.log(`🔧 Manual sync trigger requested by user ${userId}`);
    
    // Run the task asynchronously
    schedulerService.triggerManualSync(userId).catch(err => {
      console.error('Error in manual sync trigger:', err);
    });

    res.json({
      success: true,
      message: 'Sync task triggered manually. Check server logs for progress.'
    });
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger manual sync' 
    });
  }
});

export default router;
