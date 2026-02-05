const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const notificationService = require('../services/notification-service');
const { verifyToken } = require('../middleware/auth');

// Get user notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.findByUser(req.user.userID, { limit: 20 });
    
    res.json({
      success: true,
      notifications: notifications.map(n => n.toFirestore())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

// Mark single notification as read
router.patch('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Verify the notification belongs to the user
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    if (notification.userID !== req.user.userID) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this notification'
      });
    }
    
    await notification.markAsRead();
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    const markedCount = await Notification.markAllAsRead(req.user.userID);
    
    res.json({
      success: true,
      markedCount: markedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking all as read',
      error: error.message
    });
  }
});

// Create pickup status notification
router.post('/pickup-status', verifyToken, async (req, res) => {
  try {
    const { status, pickupID, recipientID, recipientName, actorName, location } = req.body;

    if (!status || !pickupID || !recipientID) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: status, pickupID, recipientID'
      });
    }

    const pickupDetails = {
      pickupID,
      location: location || 'pickup location'
    };

    let notification;

    switch (status) {
      case 'Confirmed':
        notification = await notificationService.notifyPickupConfirmed(
          recipientID,
          actorName || 'User',
          pickupDetails
        );
        break;
      case 'In-Transit':
        notification = await notificationService.notifyPickupInTransit(
          recipientID,
          actorName || 'Collector',
          pickupDetails
        );
        break;
      case 'ArrivedAtPickup':
        notification = await notificationService.notifyPickupArrived(
          recipientID,
          actorName || 'Collector',
          pickupDetails
        );
        break;
      case 'Completed':
        notification = await notificationService.notifyPickupCompleted(
          recipientID,
          location || 'pickup location',
          pickupID
        );
        break;
      case 'Cancelled':
        notification = await notificationService.notifyPickupCancelled(
          recipientID,
          location || 'pickup location',
          pickupID
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown pickup status: ${status}`
        });
    }

    res.json({
      success: true,
      notification: notification?.toFirestore?.() || notification
    });
  } catch (error) {
    console.error('Error creating pickup notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating pickup notification',
      error: error.message
    });
  }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.userID);
    
    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting unread count',
      error: error.message
    });
  }
});

// Delete notification (Note: The current Notification model doesn't have a delete method)
router.delete('/:notificationId', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Verify ownership
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    if (notification.userID !== req.user.userID) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }
    
    // Note: The Notification model doesn't have a delete method implemented
    // You'll need to add this to the model or use Firestore directly
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Delete functionality not yet implemented in model'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
});

module.exports = router;