// models/Notification.js - Notification system for pickup management
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(data = {}) {
    this.notificationID = data.notificationID || uuidv4();
    this.userID = data.userID || '';
    this.type = data.type || 'General';
    this.title = data.title || '';
    this.message = data.message || '';
    this.referenceID = data.referenceID || ''; // ID of related entity (pickup, post, etc.)
    this.referenceType = data.referenceType || ''; // 'pickup', 'post', 'message', etc.
    this.metadata = data.metadata || {}; // Additional data specific to notification type
    this.isRead = data.isRead || false;
    this.isActioned = data.isActioned || false;
    this.actionURL = data.actionURL || '';
    this.priority = data.priority || 'normal'; // 'low', 'normal', 'high', 'urgent'
    this.createdAt = data.createdAt || new Date();
    this.readAt = data.readAt || null;
    this.expiresAt = data.expiresAt || null;
  }

  // Notification types specific to pickup management
  static TYPES = {
    // Pickup-related
    PICKUP_SCHEDULED: 'Pickup_Scheduled',
    PICKUP_CONFIRMED: 'Pickup_Confirmed',
    PICKUP_DECLINED: 'Pickup_Declined',
    PICKUP_CANCELLED: 'Pickup_Cancelled',
    PICKUP_STARTED: 'Pickup_Started',
    PICKUP_COMPLETED: 'Pickup_Completed',
    PICKUP_REMINDER: 'Pickup_Reminder',
    PICKUP_UPDATED: 'Pickup_Updated',
    
    // Post-related
    POST_CLAIMED: 'Post_Claimed',
    POST_SUPPORT: 'Post_Support',
    
    // System
    SYSTEM: 'System',
    MESSAGE: 'Message'
  };

  // Priority levels
  static PRIORITY = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  };

  // Validation
  validate() {
    const errors = [];
    
    if (!this.userID) errors.push('User ID is required');
    if (!this.type) errors.push('Notification type is required');
    if (!this.title) errors.push('Title is required');
    if (!this.message) errors.push('Message is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      notificationID: this.notificationID,
      userID: this.userID,
      type: this.type,
      title: this.title,
      message: this.message,
      referenceID: this.referenceID,
      referenceType: this.referenceType,
      metadata: this.metadata,
      isRead: this.isRead,
      isActioned: this.isActioned,
      actionURL: this.actionURL,
      priority: this.priority,
      createdAt: this.createdAt,
      readAt: this.readAt,
      expiresAt: this.expiresAt
    };
  }

  // Create a notification
  static async create(notificationData) {
    const db = getFirestore();
    const notification = new Notification(notificationData);
    
    const validation = notification.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const notifRef = doc(db, 'notifications', notification.notificationID);
    await setDoc(notifRef, notification.toFirestore());
    
    // Trigger real-time update if user is online (implement with WebSocket/Firebase Realtime)
    await this.triggerRealtimeUpdate(notification.userID, notification);
    
    return notification;
  }

  // Get notification by ID
  static async findById(notificationID) {
    const db = getFirestore();
    const notifRef = doc(db, 'notifications', notificationID);
    const notifSnap = await getDoc(notifRef);
    
    if (!notifSnap.exists()) {
      throw new Error('Notification not found');
    }
    
    return new Notification(notifSnap.data());
  }

  // Get user's notifications
  static async findByUser(userID, options = {}) {
    const db = getFirestore();
    const notifsRef = collection(db, 'notifications');
    
    let q = query(
      notifsRef,
      where('userID', '==', userID),
      orderBy('createdAt', 'desc')
    );
    
    // Add filters
    if (options.unreadOnly) {
      q = query(q, where('isRead', '==', false));
    }
    
    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }
    
    if (options.priority) {
      q = query(q, where('priority', '==', options.priority));
    }
    
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => new Notification(doc.data()));
    
    // Filter out expired notifications
    const now = new Date();
    return notifications.filter(n => !n.expiresAt || n.expiresAt > now);
  }

  // Mark notification as read
  async markAsRead() {
    const db = getFirestore();
    const notifRef = doc(db, 'notifications', this.notificationID);
    
    this.isRead = true;
    this.readAt = new Date();
    
    await updateDoc(notifRef, {
      isRead: true,
      readAt: this.readAt
    });
    
    return this;
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userID) {
    const notifications = await this.findByUser(userID, { unreadOnly: true });
    
    await Promise.all(notifications.map(n => n.markAsRead()));
    
    return notifications.length;
  }

  // Get unread count
  static async getUnreadCount(userID) {
    const notifications = await this.findByUser(userID, { unreadOnly: true });
    return notifications.length;
  }

  // Create pickup-specific notifications
  static async createPickupNotification(type, pickup, additionalData = {}) {
    const templates = {
      [this.TYPES.PICKUP_SCHEDULED]: {
        title: 'Pickup Scheduled',
        message: `A pickup has been scheduled for ${pickup.pickupDate} at ${pickup.pickupTime}`,
        priority: this.PRIORITY.HIGH
      },
      [this.TYPES.PICKUP_CONFIRMED]: {
        title: 'Pickup Confirmed',
        message: `Your pickup for ${pickup.postTitle} has been confirmed`,
        priority: this.PRIORITY.HIGH
      },
      [this.TYPES.PICKUP_DECLINED]: {
        title: 'Pickup Declined',
        message: `The pickup request for ${pickup.postTitle} has been declined`,
        priority: this.PRIORITY.NORMAL
      },
      [this.TYPES.PICKUP_CANCELLED]: {
        title: 'Pickup Cancelled',
        message: `The pickup for ${pickup.postTitle} has been cancelled`,
        priority: this.PRIORITY.HIGH
      },
      [this.TYPES.PICKUP_STARTED]: {
        title: 'Pickup Started',
        message: `The collector has arrived for your pickup`,
        priority: this.PRIORITY.URGENT
      },
      [this.TYPES.PICKUP_COMPLETED]: {
        title: 'Pickup Completed',
        message: `Your pickup has been completed successfully`,
        priority: this.PRIORITY.NORMAL
      },
      [this.TYPES.PICKUP_REMINDER]: {
        title: 'Upcoming Pickup',
        message: `Reminder: You have a pickup scheduled soon`,
        priority: this.PRIORITY.HIGH
      },
      [this.TYPES.PICKUP_UPDATED]: {
        title: 'Pickup Updated',
        message: `The pickup details have been updated`,
        priority: this.PRIORITY.NORMAL
      }
    };
    
    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown pickup notification type: ${type}`);
    }
    
    // Determine recipient
    let recipientID = additionalData.recipientID;
    if (!recipientID) {
      // Default logic based on notification type
      if (additionalData.notifyGiver) {
        recipientID = pickup.giverID;
      } else if (additionalData.notifyCollector) {
        recipientID = pickup.collectorID;
      } else {
        // Notify the other party
        recipientID = additionalData.senderID === pickup.giverID 
          ? pickup.collectorID 
          : pickup.giverID;
      }
    }
    
    return await this.create({
      userID: recipientID,
      type: type,
      title: additionalData.title || template.title,
      message: additionalData.message || template.message,
      referenceID: pickup.pickupID,
      referenceType: 'pickup',
      priority: additionalData.priority || template.priority,
      actionURL: `/pickups/${pickup.pickupID}`,
      metadata: {
        pickupID: pickup.pickupID,
        postID: pickup.postID,
        pickupDate: pickup.pickupDate,
        pickupTime: pickup.pickupTime,
        pickupLocation: pickup.pickupLocation,
        ...additionalData.metadata
      }
    });
  }

  // Batch create notifications for multiple users
  static async createBatch(userIDs, notificationData) {
    const notifications = await Promise.all(
      userIDs.map(userID => 
        this.create({
          ...notificationData,
          userID
        })
      )
    );
    
    return notifications;
  }

  // Delete old notifications (cleanup job)
  static async deleteOldNotifications(daysToKeep = 30) {
    const db = getFirestore();
    const notifsRef = collection(db, 'notifications');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const q = query(
      notifsRef,
      where('createdAt', '<', cutoffDate),
      where('isRead', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    
    return snapshot.docs.length;
  }

  // Trigger real-time update (implement with your real-time solution)
  static async triggerRealtimeUpdate(userID, notification) {
    // This would integrate with your WebSocket server or Firebase Realtime Database
    // For now, just a placeholder
    console.log(`Real-time notification for user ${userID}:`, notification.title);
    
    // Example implementation with Firebase Realtime Database:
    // const realtimeDb = getDatabase();
    // const userNotifRef = ref(realtimeDb, `userNotifications/${userID}/${notification.notificationID}`);
    // await set(userNotifRef, {
    //   title: notification.title,
    //   message: notification.message,
    //   createdAt: notification.createdAt.toISOString()
    // });
  }

  // Get notification summary for user
  static async getUserSummary(userID) {
    const notifications = await this.findByUser(userID, { limit: 100 });
    
    const summary = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {},
      byPriority: {},
      recent: notifications.slice(0, 5)
    };
    
    // Group by type
    notifications.forEach(n => {
      summary.byType[n.type] = (summary.byType[n.type] || 0) + 1;
      summary.byPriority[n.priority] = (summary.byPriority[n.priority] || 0) + 1;
    });
    
    return summary;
  }
}

module.exports = Notification;