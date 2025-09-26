// routes/pickupRoutes.js - ORGANIZED & COMPLETE Pickup Management Routes
const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickupController');
const { verifyToken } = require('../middleware/auth');
const Pickup = require('../models/Pickup');
const Post = require('../models/Posts');
const Notification = require('../models/Notification');

// ============================================================================
// MIDDLEWARE - Apply authentication to ALL pickup routes
// ============================================================================
router.use(verifyToken);

// ============================================================================
// PICKUP CRUD OPERATIONS
// ============================================================================

// Create a new pickup schedule
router.post('/create', pickupController.createPickup);

// Get pickup details by ID
router.get('/:pickupID', pickupController.getPickupById);

// Update pickup details (before confirmation only)
router.put('/:pickupID/update', pickupController.updatePickup);

// ============================================================================
// USER-SPECIFIC PICKUP ROUTES
// ============================================================================

// Get all pickups for current user (with optional filters)
// Query params: ?role=giver|collector|both&status=Proposed|Confirmed|etc
router.get('/user/all', pickupController.getUserPickups);

// Get upcoming pickups for current user
// Query params: ?role=giver|collector|both
router.get('/user/upcoming', pickupController.getUpcomingPickups);

// Get user's pickup summary (for dashboard)
router.get('/user/summary', async (req, res) => {
  try {
    const userID = req.user.userID;
    
    const summary = {
      upcoming: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0
    };
    
    const pickups = await Pickup.findByUser(userID);
    
    pickups.forEach(pickup => {
      switch(pickup.status) {
        case 'Proposed':
        case 'Confirmed':
          summary.upcoming++;
          break;
        case 'In-Progress':
          summary.inProgress++;
          break;
        case 'Completed':
          summary.completed++;
          break;
        case 'Cancelled':
          summary.cancelled++;
          break;
      }
    });
    
    const nextPickup = await Pickup.getNextUpcoming(userID);
    
    res.json({ 
      success: true, 
      summary,
      nextPickup,
      totalPickups: pickups.length
    });
  } catch (error) {
    console.error('Error fetching pickup summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// POST-SPECIFIC PICKUP ROUTES
// ============================================================================

// Get all pickups for a specific post
router.get('/post/:postID', pickupController.getPostPickups);

// Get active pickup for a post (if any)
router.get('/post/:postID/active', pickupController.getActivePickup);

// Get pickup history for a specific post
router.get('/post/:postID/history', async (req, res) => {
  try {
    const { postID } = req.params;
    const post = await Post.findById(postID);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check authorization (post owner or admin)
    const userID = req.user.userID;
    if (post.userID !== userID && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view pickup history'
      });
    }
    
    const pickups = await Pickup.findByPost(postID);
    
    res.json({ 
      success: true, 
      pickups,
      count: pickups.length
    });
  } catch (error) {
    console.error('Error fetching pickup history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// PICKUP STATUS MANAGEMENT
// ============================================================================

// Confirm a pickup (Giver only)
router.put('/:pickupID/confirm', pickupController.confirmPickup);

// Start a pickup (Collector only)
router.put('/:pickupID/start', pickupController.startPickup);

// Complete a pickup (Giver only)
router.put('/:pickupID/complete', pickupController.completePickup);

// Cancel a pickup
router.put('/:pickupID/cancel', pickupController.cancelPickup);

// Check if pickup can be cancelled (5-hour rule)
router.get('/:pickupID/can-cancel', pickupController.checkCancellation);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// Get pickup-related notifications for current user
router.get('/notifications/all', async (req, res) => {
  try {
    const userID = req.user.userID;
    const pickupNotifications = await Notification.findByUserAndType(
      userID, 
      [
        Notification.TYPES.PICKUP_SCHEDULED,
        Notification.TYPES.PICKUP_CONFIRMED,
        Notification.TYPES.PICKUP_CANCELLED,
        Notification.TYPES.PICKUP_REMINDER,
        Notification.TYPES.PICKUP_COMPLETED
      ]
    );
    
    res.json({ 
      success: true, 
      notifications: pickupNotifications 
    });
  } catch (error) {
    console.error('Error fetching pickup notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Mark pickup notification as read
router.put('/notifications/:notificationID/read', async (req, res) => {
  try {
    const { notificationID } = req.params;
    const notification = await Notification.findById(notificationID);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Notification not found' 
      });
    }
    
    if (notification.userID !== req.user.userID) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    await notification.markAsRead();
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

// Get pickup statistics for a user
router.get('/stats/user/:userID?', async (req, res) => {
  try {
    // Use provided userID or current user's ID
    const userID = req.params.userID || req.user.userID;
    
    // Only allow users to see their own stats unless they're admin
    if (userID !== req.user.userID && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view these statistics'
      });
    }
    
    const allPickups = await Pickup.findByUser(userID);
    
    const stats = {
      total: allPickups.length,
      byStatus: {},
      byRole: {
        asGiver: 0,
        asCollector: 0
      },
      completionRate: 0,
      cancellationRate: 0
    };
    
    allPickups.forEach(pickup => {
      // Count by status
      stats.byStatus[pickup.status] = (stats.byStatus[pickup.status] || 0) + 1;
      
      // Count by role
      if (pickup.giverID === userID) stats.byRole.asGiver++;
      if (pickup.collectorID === userID) stats.byRole.asCollector++;
    });
    
    // Calculate rates
    if (stats.total > 0) {
      stats.completionRate = ((stats.byStatus.Completed || 0) / stats.total * 100).toFixed(2);
      stats.cancellationRate = ((stats.byStatus.Cancelled || 0) / stats.total * 100).toFixed(2);
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching pickup statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// WEBHOOK/CRON ENDPOINTS (for automated tasks)
// ============================================================================

// Send pickup reminders (can be called by cron job)
router.post('/reminders/send', async (req, res) => {
  try {
    // This could be protected by a special API key for cron jobs
    const { apiKey } = req.headers;
    
    if (apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Find pickups happening in the next 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingPickups = await Pickup.getUpcomingWithin24Hours();
    
    for (const pickup of upcomingPickups) {
      // Send reminder to both giver and collector
      await Notification.create({
        userID: pickup.giverID,
        type: Notification.TYPES.PICKUP_REMINDER,
        title: 'Pickup Reminder',
        message: `Your pickup is scheduled for tomorrow at ${pickup.pickupTime}`,
        referenceID: pickup.pickupID,
        referenceType: 'pickup',
        priority: 'high'
      });
      
      await Notification.create({
        userID: pickup.collectorID,
        type: Notification.TYPES.PICKUP_REMINDER,
        title: 'Pickup Reminder',
        message: `You have a pickup scheduled for tomorrow at ${pickup.pickupTime}`,
        referenceID: pickup.pickupID,
        referenceType: 'pickup',
        priority: 'high'
      });
    }
    
    res.json({
      success: true,
      message: `Sent reminders for ${upcomingPickups.length} pickups`
    });
  } catch (error) {
    console.error('Error sending pickup reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;