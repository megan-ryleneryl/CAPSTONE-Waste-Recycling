// notificationService.js - Streamlined Notification Service
const { admin } = require('../config/firebase');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.messaging = admin ? admin.messaging() : null;
  }

  // Main method: Create notification in database AND send push notification
  async createAndSendNotification(notificationData, userToken = null) {
    try {
      // 1. Save notification to database
      const notification = await Notification.create(notificationData);

      // 2. Send push notification if user token is provided and FCM is available
      if (userToken && this.messaging) {
        await this.sendPushNotification(
          userToken,
          notification.title,
          notification.message,
          {
            notificationID: notification.notificationID,
            type: notification.type,
            referenceID: notification.referenceID
          }
        );
      }

      return notification;
    } catch (error) {
      throw new Error(`Failed to create and send notification: ${error.message}`);
    }
  }

  // Send push notification only (internal method)
  async sendPushNotification(userToken, title, message, data = {}) {
    if (!this.messaging) {
      console.warn('FCM not initialized - skipping push notification');
      return null;
    }

    try {
      const messagePayload = {
        token: userToken,
        notification: {
          title,
          body: message,
        },
        data: {
          ...data,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4CAF50', // Green for recycling theme
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default'
            }
          }
        }
      };

      const response = await this.messaging.send(messagePayload);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Push notification failed:', error.message);
      // Don't throw error - notification was still saved to database
      return { success: false, error: error.message };
    }
  }

  // Specific notification types with predefined templates

  // Pickup notifications
  async notifyPickupProposed(giverID, collectorName, pickupDetails, giverToken = null) {
    return await this.createAndSendNotification({
      userID: giverID,
      type: 'Pickup',
      title: 'New Pickup Request',
      message: `${collectorName} wants to collect your waste at ${pickupDetails.location}`,
      referenceID: pickupDetails.pickupID
    }, giverToken);
  }

  async notifyPickupConfirmed(collectorID, giverName, pickupDetails, collectorToken = null) {
    return await this.createAndSendNotification({
      userID: collectorID,
      type: 'Pickup',
      title: 'Pickup Confirmed',
      message: `${giverName} confirmed your pickup request at ${pickupDetails.location}`,
      referenceID: pickupDetails.pickupID
    }, collectorToken);
  }

  async notifyPickupCompleted(userID, location, pickupID, userToken = null) {
    return await this.createAndSendNotification({
      userID: userID,
      type: 'Pickup',
      title: 'Pickup Completed',
      message: `Pickup at ${location} has been completed successfully`,
      referenceID: pickupID
    }, userToken);
  }

  async notifyPickupCancelled(userID, location, pickupID, userToken = null) {
    return await this.createAndSendNotification({
      userID: userID,
      type: 'Pickup',
      title: 'Pickup Cancelled',
      message: `The pickup at ${location} has been cancelled`,
      referenceID: pickupID
    }, userToken);
  }

  // Application notifications
  async notifyApplicationStatus(userID, applicationType, status, userToken = null) {
    const typeNames = {
      'Account_Verification': 'Account Verification',
      'Org_Verification': 'Organization Verification',
      'Collector_Privilege': 'Collector Privilege'
    };

    const title = `${typeNames[applicationType] || applicationType} ${status}`;
    const message = status === 'Approved' 
      ? `Your ${typeNames[applicationType]?.toLowerCase() || applicationType} application has been approved!`
      : `Your ${typeNames[applicationType]?.toLowerCase() || applicationType} application has been ${status.toLowerCase()}`;

    return await this.createAndSendNotification({
      userID: userID,
      type: 'Application',
      title: title,
      message: message,
      referenceID: `${applicationType}_${userID}`
    }, userToken);
  }

  // Badge notifications
  async notifyBadgeEarned(userID, badgeName, badgeID, userToken = null) {
    return await this.createAndSendNotification({
      userID: userID,
      type: 'Badge',
      title: 'Badge Earned! 🏆',
      message: `Congratulations! You've earned the "${badgeName}" badge`,
      referenceID: badgeID
    }, userToken);
  }

  // Message notifications
  async notifyNewMessage(receiverID, senderName, messagePreview, messageID, receiverToken = null) {
    return await this.createAndSendNotification({
      userID: receiverID,
      type: 'Message',
      title: `Message from ${senderName}`,
      message: messagePreview,
      referenceID: messageID
    }, receiverToken);
  }

  // Comment notifications
  async notifyNewComment(postOwnerID, commenterName, postTitle, commentID, ownerToken = null) {
    return await this.createAndSendNotification({
      userID: postOwnerID,
      type: 'Comment',
      title: 'New Comment',
      message: `${commenterName} commented on your post: "${postTitle}"`,
      referenceID: commentID
    }, ownerToken);
  }

  // System alerts
  async notifySystemAlert(userID, title, message, userToken = null) {
    return await this.createAndSendNotification({
      userID: userID,
      type: 'Alert',
      title: title,
      message: message,
      referenceID: null
    }, userToken);
  }

  // Broadcast notifications to multiple users
  async sendBroadcastNotification(userIDs, title, message, type = 'Alert', userTokens = {}) {
    try {
      const results = await Promise.all(
        userIDs.map(async (userID) => {
          return await this.createAndSendNotification({
            userID: userID,
            type: type,
            title: title,
            message: message,
            referenceID: null
          }, userTokens[userID] || null);
        })
      );

      return {
        success: true,
        sentCount: results.filter(r => r.success).length,
        totalCount: userIDs.length
      };
    } catch (error) {
      throw new Error(`Failed to send broadcast notification: ${error.message}`);
    }
  }

  // Topic-based notifications (for announcements)
  async sendTopicNotification(topic, title, message, data = {}) {
    if (!this.messaging) {
      console.warn('FCM not initialized - cannot send topic notification');
      return { success: false, error: 'FCM not available' };
    }

    try {
      const messagePayload = {
        topic,
        notification: { title, body: message },
        data: {
          ...data,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        }
      };

      const response = await this.messaging.send(messagePayload);
      return { success: true, messageId: response };
    } catch (error) {
      throw new Error(`Failed to send topic notification: ${error.message}`);
    }
  }

  // Subscribe user to topics
  async subscribeToTopic(userToken, topic) {
    if (!this.messaging) {
      return { success: false, error: 'FCM not available' };
    }

    try {
      const response = await this.messaging.subscribeToTopic([userToken], topic);
      return { success: true, response };
    } catch (error) {
      throw new Error(`Failed to subscribe to topic: ${error.message}`);
    }
  }

  // Get user's notification preferences (placeholder for future feature)
  async getUserNotificationPreferences(userID) {
    // This could be expanded to read from user settings
    return {
      pushNotifications: true,
      emailNotifications: false,
      smsNotifications: false,
      categories: {
        pickup: true,
        application: true,
        badge: true,
        message: true,
        comment: true,
        alert: true
      }
    };
  }

  // Bulk mark notifications as read
  async markNotificationsAsRead(userID, notificationIDs) {
    try {
      await Promise.all(
        notificationIDs.map(id => Notification.update(id, { 
          isRead: true, 
          readAt: new Date() 
        }))
      );
      
      return { success: true, markedCount: notificationIDs.length };
    } catch (error) {
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }
  }

  // Clean up old notifications (admin function)
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      // This would need to be implemented based on your cleanup strategy
      // For now, just return success
      return { success: true, message: `Cleanup initiated for notifications older than ${daysOld} days` };
    } catch (error) {
      throw new Error(`Failed to cleanup old notifications: ${error.message}`);
    }
  }
}

module.exports = new NotificationService();