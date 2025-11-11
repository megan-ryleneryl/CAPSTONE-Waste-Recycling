const { getFirestore, doc, setDoc } = require('firebase/firestore');

class Message {
  constructor(data = {}) {
    this.messageID = data.messageID || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.senderID = data.senderID || '';
    this.senderName = data.senderName || '';
    this.receiverID = data.receiverID || '';
    this.receiverName = data.receiverName || '';
    this.postID = data.postID || '';
    this.postTitle = data.postTitle || '';
    this.postType = data.postType || '';
    this.message = data.message || '';
    this.sentAt = data.sentAt || new Date();
    this.isRead = data.isRead || false;
    this.isDeleted = data.isDeleted || false;

    // Extended fields for Module 2 chat functionality
    this.messageType = data.messageType || 'text'; // 'text', 'system', 'pickup_request', 'pickup_confirmation', 'claim'
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
    senderName: this.senderName || 'Unknown User',
    receiverID: this.receiverID,
    receiverName: this.receiverName || 'Unknown User',
    postID: this.postID,
    postTitle: this.postTitle || 'Unknown Post',
    postType: this.postType || 'Waste',
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
}

module.exports = Message;