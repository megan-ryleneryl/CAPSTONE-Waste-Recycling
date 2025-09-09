// models/Message.js - Extended version of your existing model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, or } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Message {
  constructor(data = {}) {
    this.messageID = data.messageID || uuidv4();
    this.senderID = data.senderID || '';
    this.receiverID = data.receiverID || '';
    this.postID = data.postID || '';
    this.message = data.message || '';
    this.sentAt = data.sentAt || new Date();
    this.isRead = data.isRead || false;
    this.isDeleted = data.isDeleted || false;
    
    // NEW: Extended fields for Module 2 chat functionality
    this.messageType = data.messageType || 'text'; // 'text', 'system', 'pickup_request', 'pickup_confirmation'
    this.senderName = data.senderName || '';
    this.senderType = data.senderType || ''; // 'Giver', 'Collector', 'system'
    this.metadata = data.metadata || {}; // For storing pickup details, system actions, etc.
  }

  // Validation (updated to support new fields)
  validate() {
    const errors = [];
    
    if (!this.senderID && this.messageType !== 'system') errors.push('Sender ID is required');
    if (!this.receiverID) errors.push('Receiver ID is required');
    if (!this.postID) errors.push('Post ID is required');
    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message content is required');
    }
    if (this.message.length > 2000) {
      errors.push('Message must be less than 2000 characters');
    }
    if (this.senderID === this.receiverID && this.messageType !== 'system') {
      errors.push('Sender and receiver cannot be the same');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore (updated)
  toFirestore() {
    return {
      messageID: this.messageID,
      senderID: this.senderID,
      receiverID: this.receiverID,
      postID: this.postID,
      message: this.message.trim(),
      sentAt: this.sentAt,
      isRead: this.isRead,
      isDeleted: this.isDeleted,
      // New fields
      messageType: this.messageType,
      senderName: this.senderName,
      senderType: this.senderType,
      metadata: this.metadata
    };
  }

  // NEW: Static method for creating pickup coordination messages
  static async createPickupMessage(senderData, receiverID, postID, messageText, pickupData = null) {
    const messageData = {
      senderID: senderData.userID,
      senderName: `${senderData.firstName} ${senderData.lastName}`,
      senderType: senderData.userType,
      receiverID,
      postID,
      message: messageText,
      messageType: pickupData ? 'pickup_request' : 'text',
      metadata: pickupData || {}
    };

    return await Message.create(messageData);
  }

  // NEW: Static method for system messages
  static async createSystemMessage(receiverID, postID, messageText, actionData = {}) {
    const messageData = {
      senderID: 'system',
      senderName: 'System',
      senderType: 'system',
      receiverID,
      postID,
      message: messageText,
      messageType: 'system',
      metadata: actionData
    };

    return await Message.create(messageData);
  }

  // NEW: Get conversation between two users for a specific post (Module 2 chat)
  static async getConversation(user1ID, user2ID, postID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q1 = query(messagesRef, 
        where('postID', '==', postID),
        where('senderID', '==', user1ID),
        where('receiverID', '==', user2ID),
        where('isDeleted', '==', false),
        orderBy('sentAt', 'asc')
      );
      
      const q2 = query(messagesRef,
        where('postID', '==', postID), 
        where('senderID', '==', user2ID),
        where('receiverID', '==', user1ID),
        where('isDeleted', '==', false),
        orderBy('sentAt', 'asc')
      );

      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const messages = [];
      
      snapshot1.forEach((doc) => {
        messages.push(new Message(doc.data()));
      });
      
      snapshot2.forEach((doc) => {
        messages.push(new Message(doc.data()));
      });

      // Sort by timestamp
      return messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    } catch (error) {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  // NEW: Get active conversations for a user (for Module 2 inbox)
  static async getUserConversations(userID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      
      // Get all messages where user is sender or receiver
      const q1 = query(messagesRef, 
        where('senderID', '==', userID),
        where('isDeleted', '==', false),
        orderBy('sentAt', 'desc')
      );
      
      const q2 = query(messagesRef,
        where('receiverID', '==', userID),
        where('isDeleted', '==', false),
        orderBy('sentAt', 'desc')
      );

      const [senderSnapshot, receiverSnapshot] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const allMessages = [];
      
      senderSnapshot.forEach((doc) => {
        allMessages.push(new Message(doc.data()));
      });
      
      receiverSnapshot.forEach((doc) => {
        allMessages.push(new Message(doc.data()));
      });

      // Group by conversation (postID + other participant)
      const conversations = {};
      
      allMessages.forEach(message => {
        const otherUserID = message.senderID === userID ? message.receiverID : message.senderID;
        const conversationKey = `${message.postID}_${otherUserID}`;
        
        if (!conversations[conversationKey] || 
            new Date(message.sentAt) > new Date(conversations[conversationKey].lastMessage.sentAt)) {
          conversations[conversationKey] = {
            postID: message.postID,
            otherUserID,
            lastMessage: message,
            unreadCount: allMessages.filter(m => 
              m.postID === message.postID &&
              m.senderID === otherUserID &&
              m.receiverID === userID &&
              !m.isRead
            ).length
          };
        }
      });

      return Object.values(conversations);
    } catch (error) {
      throw new Error(`Failed to get user conversations: ${error.message}`);
    }
  }

  // NEW: Mark conversation as read
  static async markConversationAsRead(userID, otherUserID, postID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef,
        where('postID', '==', postID),
        where('senderID', '==', otherUserID),
        where('receiverID', '==', userID),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = [];

      snapshot.forEach((doc) => {
        updatePromises.push(updateDoc(doc.ref, { isRead: true }));
      });

      await Promise.all(updatePromises);
      return { success: true, messagesUpdated: snapshot.size };
    } catch (error) {
      throw new Error(`Failed to mark conversation as read: ${error.message}`);
    }
  }

  // NEW: Get unread count for user
  static async getUnreadCount(userID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef,
        where('receiverID', '==', userID),
        where('isRead', '==', false),
        where('isDeleted', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Existing static methods (keeping all your original functionality)
  static async create(messageData) {
    const db = getFirestore();
    const message = new Message(messageData);
    
    const validation = message.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const messageRef = doc(db, 'messages', message.messageID);
      await setDoc(messageRef, message.toFirestore());
      
      // Create notification for receiver (only for non-system messages)
      if (message.messageType !== 'system') {
        const Notification = require('./Notification');
        await Notification.create({
          userID: message.receiverID,
          type: 'Message',
          title: 'New Message',
          message: `You have a new message from ${message.senderName || 'a user'}`,
          referenceID: message.messageID
        });
      }
      
      return message;
    } catch (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  static async findById(messageID) {
    const db = getFirestore();
    try {
      const messageRef = doc(db, 'messages', messageID);
      const messageSnap = await getDoc(messageRef);
      
      if (messageSnap.exists()) {
        return new Message(messageSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find message: ${error.message}`);
    }
  }

  static async findConversation(user1ID, user2ID, postID) {
    // Use the new enhanced method
    return await Message.getConversation(user1ID, user2ID, postID);
  }

  static async findByPostID(postID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('postID', '==', postID), orderBy('sentAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push(new Message(doc.data()));
      });
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to find messages by post: ${error.message}`);
    }
  }

  static async findBySenderID(senderID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('senderID', '==', senderID), orderBy('sentAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push(new Message(doc.data()));
      });
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to find messages by sender: ${error.message}`);
    }
  }

  static async findByReceiverID(receiverID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('receiverID', '==', receiverID), orderBy('sentAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push(new Message(doc.data()));
      });
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to find messages by receiver: ${error.message}`);
    }
  }

  static async findUnreadMessages(userID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, 
        where('receiverID', '==', userID),
        where('isRead', '==', false),
        where('isDeleted', '==', false),
        orderBy('sentAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push(new Message(doc.data()));
      });
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to find unread messages: ${error.message}`);
    }
  }

  static async update(messageID, updateData) {
    const db = getFirestore();
    try {
      const messageRef = doc(db, 'messages', messageID);
      await updateDoc(messageRef, updateData);
      
      return await Message.findById(messageID);
    } catch (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }

  static async delete(messageID) {
    const db = getFirestore();
    try {
      const messageRef = doc(db, 'messages', messageID);
      await deleteDoc(messageRef);
      return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  static async markAsRead(messageID) {
    try {
      await Message.update(messageID, { isRead: true });
      return { success: true, message: 'Message marked as read' };
    } catch (error) {
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }
  }

  // All your existing instance methods remain the same
  async save() {
    return await Message.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Message.update(this.messageID, updateData);
  }

  async delete() {
    return await Message.delete(this.messageID);
  }

  async markAsRead() {
    if (!this.isRead) {
      await this.update({ 
        isRead: true, 
        readAt: new Date() 
      });
    }
  }

  async markAsDeleted() {
    await this.update({ 
      isDeleted: true, 
      deletedAt: new Date() 
    });
  }

  // Get sender information
  async getSender() {
    const User = require('./User');
    return await User.findById(this.senderID);
  }

  // Get receiver information
  async getReceiver() {
    const User = require('./User');
    return await User.findById(this.receiverID);
  }

  // Get related post information
  async getPost() {
    const Post = require('./Post');
    return await Post.findById(this.postID);
  }

  // Get message age in human readable format
  getAge() {
    const now = new Date();
    const diffTime = now - this.sentAt;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.sentAt.toLocaleDateString();
  }

  // Check if message can be deleted (within 1 hour of sending)
  canBeDeleted() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.sentAt > oneHourAgo;
  }

  // Get message preview (first 50 characters)
  getPreview() {
    return this.message.length > 50 ? 
      this.message.substring(0, 50) + '...' : 
      this.message;
  }
}

module.exports = Message;