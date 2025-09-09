import Message from '../models/Message';

class ChatService {
  // Create or start a conversation for a post interaction
  static async startConversation(postData, giverData, collectorData, initialMessage) {
    try {
      // Create initial message from collector to giver
      const message = await Message.createPickupMessage(
        collectorData,
        giverData.userID,
        postData.postID,
        initialMessage
      );

      // Also create a system message for context
      await Message.createSystemMessage(
        giverData.userID,
        postData.postID,
        `${collectorData.firstName} ${collectorData.lastName} is interested in your recyclables. Let's coordinate the pickup details!`
      );

      return message;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }

  // Get conversation between two users for a specific post
  static async getConversation(user1ID, user2ID, postID) {
    try {
      return await Message.getConversation(user1ID, user2ID, postID);
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  // Get all conversations for a user
  static async getUserConversations(userID) {
    try {
      return await Message.getUserConversations(userID);
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  // Send a message in a conversation
  static async sendMessage(senderData, receiverID, postID, messageText) {
    try {
      return await Message.create({
        senderID: senderData.userID,
        senderName: `${senderData.firstName} ${senderData.lastName}`,
        senderType: senderData.userType,
        receiverID,
        postID,
        message: messageText,
        messageType: 'text'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send pickup request with details
  static async sendPickupRequest(senderData, receiverID, postID, messageText, pickupDetails) {
    try {
      return await Message.createPickupMessage(
        senderData,
        receiverID,
        postID,
        messageText,
        pickupDetails
      );
    } catch (error) {
      console.error('Error sending pickup request:', error);
      throw error;
    }
  }

  // Mark conversation as read
  static async markConversationAsRead(userID, otherUserID, postID) {
    try {
      return await Message.markConversationAsRead(userID, otherUserID, postID);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  // Get unread message count for user
  static async getUnreadCount(userID) {
    try {
      return await Message.getUnreadCount(userID);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

export default ChatService;