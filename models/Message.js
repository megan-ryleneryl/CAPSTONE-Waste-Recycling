// Message.js - Firestore Message Model
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
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.senderID) errors.push('Sender ID is required');
    if (!this.receiverID) errors.push('Receiver ID is required');
    if (!this.postID) errors.push('Post ID is required');
    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message content is required');
    }
    if (this.message.length > 2000) {
      errors.push('Message must be less than 2000 characters');
    }
    if (this.senderID === this.receiverID) {
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
      receiverID: this.receiverID,
      postID: this.postID,
      message: this.message.trim(),
      sentAt: this.sentAt,
      isRead: this.isRead,
      isDeleted: this.isDeleted
    };
  }

  // Static methods for database operations
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
      
      // Create notification for receiver
      const Notification = require('./Notification');
      await Notification.create({
        userID: message.receiverID,
        type: 'Message',
        title: 'New Message',
        message: `You have a new message about post: ${message.postID}`,
        referenceID: message.messageID
      });
      
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
    const db = getFirestore();
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, 
        where('postID', '==', postID),
        orderBy('sentAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const messages = [];
      querySnapshot.forEach((doc) => {
        const messageData = doc.data();
        // Filter for conversation between two users
        if ((messageData.senderID === user1ID && messageData.receiverID === user2ID) ||
            (messageData.senderID === user2ID && messageData.receiverID === user1ID)) {
          messages.push(new Message(messageData));
        }
      });
      
      return messages;
    } catch (error) {
      throw new Error(`Failed to find conversation: ${error.message}`);
    }
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
      return await Message.update(messageID, { 
        isRead: true, 
        readAt: new Date() 
      });
    } catch (error) {
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }
  }

  static async markConversationAsRead(user1ID, user2ID, postID) {
    try {
      const conversation = await Message.findConversation(user1ID, user2ID, postID);
      const unreadMessages = conversation.filter(msg => 
        msg.receiverID === user1ID && !msg.isRead
      );
      
      await Promise.all(
        unreadMessages.map(msg => Message.markAsRead(msg.messageID))
      );
      
      return { success: true, messagesMarked: unreadMessages.length };
    } catch (error) {
      throw new Error(`Failed to mark conversation as read: ${error.message}`);
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