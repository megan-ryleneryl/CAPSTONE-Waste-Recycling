// TODO
// Check for userType usage

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
    
    // Extended fields for Module 2 chat functionality
    this.messageType = data.messageType || 'text'; // 'text', 'system', 'pickup_request', 'pickup_confirmation'
    this.senderName = data.senderName || '';
    this.postTitle = data.postTitle || '';
    this.metadata = data.metadata || {}; // For storing pickup details, system actions, etc.
  }

  // Validation
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

// Convert to plain object for Firestore
toFirestore() {
  return {
    messageID: this.messageID,
    senderID: this.senderID,
    senderName: this.senderName || 'Unknown User', // Add fallback
    receiverID: this.receiverID,
    receiverName: this.receiverName || 'Unknown User', // Add fallback
    postID: this.postID,
    postTitle: this.postTitle || 'Unknown Post', // Add this field
    message: this.message.trim(),
    sentAt: this.sentAt,
    isRead: this.isRead,
    isDeleted: this.isDeleted,
    messageType: this.messageType,
    metadata: this.metadata
  };
}

  // Static method to create a new message
  static async create(data) {
    const message = new Message(data);
    const validation = message.validate();

    if (!validation.isValid) {
      throw new Error('Validation failed: ' + validation.errors.join(', '));
    }

    try {
      const db = getFirestore();
      const messageRef = doc(db, 'messages', message.messageID);
      await setDoc(messageRef, message.toFirestore());
      
      return message;
    } catch (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }
  }

  // Static method to find message by ID
  static async findById(messageID) {
    try {
      const db = getFirestore();
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

  // Static method to update a message
  static async update(messageID, updateData) {
    try {
      const db = getFirestore();
      const messageRef = doc(db, 'messages', messageID);
      
      // Add timestamp for updates
      updateData.updatedAt = new Date();
      
      await updateDoc(messageRef, updateData);
      
      return { success: true, message: 'Message updated successfully' };
    } catch (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }

  // Static method to delete a message
  static async delete(messageID) {
    try {
      const db = getFirestore();
      const messageRef = doc(db, 'messages', messageID);
      await updateDoc(messageRef, { 
        isDeleted: true, 
        deletedAt: new Date() 
      });
      
      return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  // Static method for creating pickup coordination messages
  static async createPickupMessage(senderData, receiverID, postID, messageText, pickupData = null) {
    const messageData = {
      senderID: senderData.userID,
      senderName: `${senderData.firstName} ${senderData.lastName}`,
      receiverID,
      postID,
      message: messageText,
      messageType: pickupData ? 'pickup_request' : 'text',
      metadata: pickupData || {}
    };

    return await Message.create(messageData);
  }

  // Static method for system messages
  static async createSystemMessage(receiverID, postID, messageText, actionData = {}) {
    const messageData = {
      senderID: 'system',
      senderName: 'System',
      receiverID,
      postID,
      message: messageText,
      messageType: 'system',
      metadata: actionData
    };

    return await Message.create(messageData);
  }

static async getConversation(user1ID, user2ID, postID) {
  const db = getFirestore();
  try {
    const messagesRef = collection(db, 'messages');
    
    // Simplified query - just get all messages for this post
    // Then filter in JavaScript to avoid index requirements
    const q = query(messagesRef, 
      where('postID', '==', postID),
      where('isDeleted', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const messages = [];
    
    snapshot.forEach((doc) => {
      const messageData = doc.data();
      // Filter for messages between these two users
      if ((messageData.senderID === user1ID && messageData.receiverID === user2ID) ||
          (messageData.senderID === user2ID && messageData.receiverID === user1ID) ||
          (messageData.messageType === 'system' && 
           (messageData.receiverID === user1ID || messageData.receiverID === user2ID))) {
        messages.push(new Message(messageData));
      }
    });

    // Sort by timestamp in JavaScript
    return messages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  } catch (error) {
    console.error('Error in getConversation:', error);
    throw new Error(`Failed to get conversation: ${error.message}`);
  }
}

// Simplified version of getUserConversations that doesn't require indexes
static async getUserConversations(userID) {
  const db = getFirestore();
  try {
    const messagesRef = collection(db, 'messages');
    
    // Simplified queries - remove orderBy to avoid index requirements
    const q1 = query(messagesRef, 
      where('senderID', '==', userID),
      where('isDeleted', '==', false)
    );
    
    const q2 = query(messagesRef,
      where('receiverID', '==', userID),
      where('isDeleted', '==', false)
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

    // Sort in JavaScript instead of Firestore
    allMessages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    // Group by conversation (postID + other participant)
    const conversations = {};
    
    allMessages.forEach(message => {
      if (message.messageType === 'system') return; // Skip system messages for conversation list
      
      const otherUserID = message.senderID === userID ? message.receiverID : message.senderID;
      const conversationKey = `${message.postID}-${otherUserID}`;
      
      if (!conversations[conversationKey] || 
          new Date(message.sentAt) > new Date(conversations[conversationKey].lastMessage.sentAt)) {
        
        conversations[conversationKey] = {
          postID: message.postID,
          otherUserID: otherUserID,
          otherUserName: message.senderID === userID ? 
            'Unknown' : // You'll need to fetch this from User model
            message.senderName,
          lastMessage: message,
          unreadCount: 0
        };
      }
    });

    // Calculate unread counts
    for (let conversationKey in conversations) {
      const conversation = conversations[conversationKey];
      const unreadMessages = allMessages.filter(msg => 
        msg.postID === conversation.postID &&
        msg.senderID === conversation.otherUserID &&
        msg.receiverID === userID &&
        !msg.isRead
      );
      conversation.unreadCount = unreadMessages.length;
    }

    // Convert to array and sort by last message time
    return Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessage.sentAt) - new Date(a.lastMessage.sentAt)
    );
  } catch (error) {
    throw new Error(`Failed to get user conversations: ${error.message}`);
  }
}

  // Mark conversation as read
  static async markConversationAsRead(userID, otherUserID, postID) {
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef,
        where('postID', '==', postID),
        where('senderID', '==', otherUserID),
        where('receiverID', '==', userID),
        where('isRead', '==', false),
        where('isDeleted', '==', false)
      );

      const snapshot = await getDocs(q);
      
      const updatePromises = [];
      snapshot.forEach((doc) => {
        updatePromises.push(
          updateDoc(doc.ref, { 
            isRead: true, 
            readAt: new Date() 
          })
        );
      });

      await Promise.all(updatePromises);
      
      return { success: true, message: 'Conversation marked as read' };
    } catch (error) {
      throw new Error(`Failed to mark conversation as read: ${error.message}`);
    }
  }

  // Get unread message count for user
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
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Instance methods
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