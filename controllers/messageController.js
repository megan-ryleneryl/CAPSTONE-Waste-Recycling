// TODO
// Check for userType usage

const Message = require('../models/Message');

class MessageController {
  // NEW: Get user's conversations (for Module 2 inbox)
  static async getUserConversations(req, res) {
    try {
      const userID = req.user.userID;
      const conversations = await Message.getUserConversations(userID);

      res.json({
        success: true,
        data: conversations,
        message: 'Conversations retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get conversations'
      });
    }
  }

  // NEW: Get specific conversation between two users for a post
  static async getConversation(req, res) {
    try {
      const { postID, otherUserID } = req.params;
      const userID = req.user.userID;

      const conversation = await Message.getConversation(userID, otherUserID, postID);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get conversation'
      });
    }
  }

  // NEW: Mark conversation as read
  static async markConversationAsRead(req, res) {
    try {
      const { postID, otherUserID } = req.params;
      const userID = req.user.userID;

      const result = await Message.markConversationAsRead(userID, otherUserID, postID);

      res.json({
        success: true,
        data: result,
        message: 'Conversation marked as read'
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark conversation as read'
      });
    }
  }

  // NEW: Send regular message
  static async sendMessage(req, res) {
    try {
      const { receiverID, postID, message } = req.body;
      const user = req.user;

      // Validation
      if (!receiverID || !postID || !message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Receiver ID, post ID, and message content are required'
        });
      }

      const newMessage = await Message.create({
        senderID: user.userID,
        senderName: `${user.firstName} ${user.lastName}`,
        senderType: user.userType,
        receiverID,
        postID,
        message: message.trim(),
        messageType: 'text'
      });

      res.status(201).json({
        success: true,
        data: newMessage,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message'
      });
    }
  }

  // NEW: Send pickup request with details
  static async sendPickupRequest(req, res) {
    try {
      const { receiverID, postID, message, pickupDetails } = req.body;
      const user = req.user;

      // Validation
      if (!receiverID || !postID || !message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Receiver ID, post ID, and message content are required'
        });
      }

      const newMessage = await Message.createPickupMessage(
        {
          userID: user.userID,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType
        },
        receiverID,
        postID,
        message.trim(),
        pickupDetails || {}
      );

      res.status(201).json({
        success: true,
        data: newMessage,
        message: 'Pickup request sent successfully'
      });
    } catch (error) {
      console.error('Error sending pickup request:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send pickup request'
      });
    }
  }

  // NEW: Get unread message count
  static async getUnreadCount(req, res) {
    try {
      const userID = req.user.userID;
      const unreadCount = await Message.getUnreadCount(userID);

      res.json({
        success: true,
        data: { unreadCount },
        message: 'Unread count retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get unread count'
      });
    }
  }

  // Your existing methods can stay the same if you have them
  static async getAllMessages(req, res) {
    try {
      // Your existing implementation
      const messages = await Message.findByReceiverID(req.user.userID);
      
      res.json({
        success: true,
        data: messages,
        message: 'Messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get messages'
      });
    }
  }

  static async getMessageById(req, res) {
    try {
      const { messageID } = req.params;
      const message = await Message.findById(messageID);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Check if user has access to this message
      if (message.senderID !== req.user.userID && message.receiverID !== req.user.userID) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this message'
        });
      }

      res.json({
        success: true,
        data: message,
        message: 'Message retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get message'
      });
    }
  }

  static async deleteMessage(req, res) {
    try {
      const { messageID } = req.params;
      const message = await Message.findById(messageID);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      // Check if user owns this message
      if (message.senderID !== req.user.userID) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
      }

      await Message.delete(messageID);

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete message'
      });
    }
  }
}

module.exports = MessageController;