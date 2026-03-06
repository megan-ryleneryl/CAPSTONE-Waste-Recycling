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

// Create pickup status notification - sends to BOTH giver and collector with appropriate messages
router.post('/pickup-status', verifyToken, async (req, res) => {
  try {
    const { status, pickupID, giverID, collectorID, giverName, collectorName, location, actorRole, postType } = req.body;

    // Support both old format (recipientID) and new format (giverID + collectorID)
    const recipientID = req.body.recipientID;
    const actorName = req.body.actorName;

    // If using old format with just recipientID, use the old behavior
    if (recipientID && !giverID && !collectorID) {
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
        case 'Proposed':
          notification = await notificationService.notifyPickupProposed(
            recipientID,
            actorName || 'Collector',
            pickupDetails
          );
          break;
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

      return res.json({
        success: true,
        notification: notification?.toFirestore?.() || notification
      });
    }

    // New format: send notifications to BOTH parties
    if (!status || !pickupID || !giverID || !collectorID) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: status, pickupID, giverID, collectorID'
      });
    }

    const loc = location || 'pickup location';
    const gName = giverName || 'Giver';
    const cName = collectorName || 'Collector';
    const isInitiative = postType === 'Initiative';
    const notifications = [];

    // Create notifications for BOTH parties with appropriate messaging
    // For Initiative posts: giver = supporter (offers materials), collector = organizer
    // For Waste posts: giver = waste owner, collector = waste collector
    switch (status) {
      case 'Proposed':
        if (isInitiative) {
          // Initiative: collector (organizer) proposed pickup for giver's (supporter's) offered materials
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Pickup Scheduled for Your Support',
            message: `${cName} scheduled a pickup for your offered materials at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'Pickup Proposed',
            message: `You proposed a pickup for ${gName}'s support materials at ${loc}. Waiting for confirmation.`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        } else {
          // Waste: collector proposed to collect giver's waste
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'New Pickup Proposal',
            message: `${cName} proposed to collect your waste at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'Pickup Proposed',
            message: `You proposed a pickup schedule for ${loc}. Waiting for ${gName} to confirm.`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        }
        break;

      case 'Confirmed':
        if (isInitiative) {
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'Support Pickup Confirmed',
            message: `${gName} confirmed the pickup for their support materials at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Pickup Confirmed',
            message: `You confirmed the pickup with ${cName} for your support materials at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        } else {
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'Pickup Confirmed',
            message: `${gName} confirmed your pickup request at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Pickup Confirmed',
            message: `You confirmed the pickup with ${cName} at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        }
        break;

      case 'In-Transit':
        if (isInitiative) {
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Organizer On The Way',
            message: `${cName} is on the way to pick up your support materials at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'On The Way',
            message: `You are on the way to pick up support materials from ${gName} at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        } else {
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Collector On The Way',
            message: `${cName} is on the way to collect your waste at ${loc}`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'On The Way',
            message: `You are on the way to ${loc}. ${gName} has been notified.`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        }
        break;

      case 'ArrivedAtPickup':
        // Generic enough for both types
        notifications.push(await notificationService.createAndSendNotification({
          userID: giverID,
          type: 'Pickup',
          title: isInitiative ? 'Organizer Has Arrived' : 'Collector Has Arrived',
          message: `${cName} has arrived at the pickup location`,
          referenceID: pickupID,
          referenceType: 'pickup'
        }));
        notifications.push(await notificationService.createAndSendNotification({
          userID: collectorID,
          type: 'Pickup',
          title: 'Arrived at Pickup',
          message: `You have arrived at the pickup location. ${gName} has been notified.`,
          referenceID: pickupID,
          referenceType: 'pickup'
        }));
        break;

      case 'Completed':
        if (isInitiative) {
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Support Materials Collected',
            message: `Your support materials have been collected by ${cName}. Thank you for contributing!`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'Support Pickup Completed',
            message: `Support materials from ${gName} at ${loc} have been collected successfully`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        } else {
          notifications.push(await notificationService.createAndSendNotification({
            userID: giverID,
            type: 'Pickup',
            title: 'Pickup Completed',
            message: `Pickup with ${cName} at ${loc} has been completed successfully`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
          notifications.push(await notificationService.createAndSendNotification({
            userID: collectorID,
            type: 'Pickup',
            title: 'Pickup Completed',
            message: `Pickup from ${gName} at ${loc} has been completed successfully`,
            referenceID: pickupID,
            referenceType: 'pickup'
          }));
        }
        break;

      case 'Cancelled':
        const cancelledBy = actorRole === 'Collector' ? cName : gName;
        notifications.push(await notificationService.createAndSendNotification({
          userID: giverID,
          type: 'Pickup',
          title: 'Pickup Cancelled',
          message: `The pickup at ${loc} was cancelled by ${cancelledBy}`,
          referenceID: pickupID,
          referenceType: 'pickup'
        }));
        notifications.push(await notificationService.createAndSendNotification({
          userID: collectorID,
          type: 'Pickup',
          title: 'Pickup Cancelled',
          message: `The pickup at ${loc} was cancelled by ${cancelledBy}`,
          referenceID: pickupID,
          referenceType: 'pickup'
        }));
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown pickup status: ${status}`
        });
    }

    res.json({
      success: true,
      notificationCount: notifications.length,
      notifications: notifications.map(n => n?.toFirestore?.() || n)
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