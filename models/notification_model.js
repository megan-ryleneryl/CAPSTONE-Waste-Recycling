// Notification.js - Firestore Notification Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(data = {}) {
    this.notificationID = data.notificationID || uuidv4();
    this.userID = data.userID || '';
    this.type = data.type || ''; // Pickup, Application, Message, Comment, Badge, Alert
    this.title = data.title || '';
    this.message = data.message || '';
    this.referenceID = data.referenceID || null; // References relevant postID/pickupID/applicationID
    this.isRead = data.isRead || false;
    this.createdAt = data.createdAt || new Date();
  }

  // Validation
  validate() {
    const validTypes = ['Pickup', 'Application', 'Message', 'Comment', 'Badge', 'Alert'];
    const errors = [];
    
    if (!this.userID) errors.push('User ID is required');
    if (!this.type || !validTypes.includes(this.type)) {
      errors.push('Valid notification type is required');
    }
    if (!this.title || this.title.trim().length === 0) {
      errors.push('Notification title is required');
    }
    if (!this.message || this.message.trim().length === 0) {
      errors.push('Notification message is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      notificationID: this.notificationID,
      userID: this.userID,
      type: this.type,
      title: this.title.trim(),
      message: this.message.trim(),
      referenceID: this.referenceID,
      isRead: this.isRead,
      createdAt: this.createdAt
    };
  }

  // Static methods for database operations
  static async create(notificationData) {
    const db = getFirestore();
    const notification = new Notification(notificationData);
    
    const validation = notification.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const notificationRef = doc(db, 'notifications', notification.notificationID);
      await setDoc(notificationRef, notification.toFirestore());
      return notification;
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }
  }

  static async findById(notificationID) {
    const db = getFirestore();
    try {
      const notificationRef = doc(db, 'notifications', notificationID);
      const notificationSnap = await getDoc(notificationRef);
      
      if (notificationSnap.exists()) {
        return new Notification(notificationSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find notification: ${error.message}`);
    }
  }

  static async findByUserID(userID, limit = 50) {
    const db = getFirestore();
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, 
        where('userID', '==', userID), 
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const notifications = [];
      let count = 0;
      querySnapshot.forEach((doc) => {
        if (count < limit) {
          notifications.push(new Notification(doc.data()));
          count++;
        }
      });
      
      return notifications;
    } catch (error) {
      throw new Error(`Failed to find notifications by user: ${error.message}`);
    }
  }

  static async findUnreadByUserID(userID) {
    const db = getFirestore();
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, 
        where('userID', '==', userID),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push(new Notification(doc.data()));
      });
      
      return notifications;
    } catch (error) {
      throw new Error(`Failed to find unread notifications: ${error.message}`);
    }
  }

  static async findByType(userID, type) {
    const db = getFirestore();
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, 
        where('userID', '==', userID),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push(new Notification(doc.data()));
      });
      
      return notifications;
    } catch (error) {
      throw new Error(`Failed to find notifications by type: ${error.message}`);
    }
  }

  static async update(notificationID, updateData) {
    const db = getFirestore();
    try {
      const notificationRef = doc(db, 'notifications', notificationID);
      await updateDoc(notificationRef, updateData);
      
      return await Notification.findById(notificationID);
    } catch (error) {
      throw new Error(`Failed to update notification: ${error.message}`);
    }
  }

  static async delete(notificationID) {
    const db = getFirestore();
    try {
      const notificationRef = doc(db, 'notifications', notificationID);
      await deleteDoc(notificationRef);
      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }

  static async markAllAsRead(userID) {
    try {
      const unreadNotifications = await Notification.findUnreadByUserID(userID);
      
      await Promise.all(
        unreadNotifications.map(notification => 
          Notification.update(notification.notificationID, { isRead: true, readAt: new Date() })
        )
      );
      
      return { success: true, markedCount: unreadNotifications.length };
    } catch (error) {
      throw new Error(`Failed to mark all as read: ${error.message}`);
    }
  }

  static async getUnreadCount(userID) {
    try {
      const unreadNotifications = await Notification.findUnreadByUserID(userID);
      return unreadNotifications.length;
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Notification.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Notification.update(this.notificationID, updateData);
  }

  async delete() {
    return await Notification.delete(this.notificationID);
  }

  async markAsRead() {
    if (!this.isRead) {
      await this.update({ 
        isRead: true, 
        readAt: new Date() 
      });
    }
  }

  // Get notification age in human readable format
  getAge() {
    const now = new Date();
    const diffTime = now - this.createdAt;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.createdAt.toLocaleDateString();
  }

  // Check if notification is recent (within last 24 hours)
  isRecent() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.createdAt > oneDayAgo;
  }

  // Get notification priority based on type
  getPriority() {
    const priorities = {
      'Alert': 'high',
      'Pickup': 'high',
      'Application': 'medium',
      'Badge': 'medium',
      'Message': 'low',
      'Comment': 'low'
    };
    
    return priorities[this.type] || 'low';
  }
}

module.exports = Notification;