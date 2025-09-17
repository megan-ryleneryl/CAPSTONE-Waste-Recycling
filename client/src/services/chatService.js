// client/src/services/chatService.js
// This is the CLIENT-SIDE service that calls your backend API

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ChatService {
  // Helper method to get auth headers
  static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all conversations for the current user
  static async getUserConversations() {
    try {
      const response = await fetch(`${API_URL}/messages/conversations`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  // Get conversation between two users for a specific post
  static async getConversation(currentUserID, otherUserID, postID) {
    try {
      const response = await fetch(
        `${API_URL}/messages/conversations/${postID}/${otherUserID}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  // Send a message in a conversation
  static async sendMessage(senderData, receiverID, postID, messageText) {
    try {
      const response = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          receiverID,
          postID,
          message: messageText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Send pickup request with details
  static async sendPickupRequest(senderData, receiverID, postID, messageText, pickupDetails) {
    try {
      const response = await fetch(`${API_URL}/messages/pickup-request`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          receiverID,
          postID,
          message: messageText,
          pickupDetails
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send pickup request');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error sending pickup request:', error);
      throw error;
    }
  }

  // Mark conversation as read
  static async markConversationAsRead(currentUserID, otherUserID, postID) {
    try {
      const response = await fetch(
        `${API_URL}/messages/conversations/${postID}/${otherUserID}/read`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark conversation as read');
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  // Get unread message count for user
  static async getUnreadCount() {
    try {
      const response = await fetch(`${API_URL}/messages/unread-count`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to get unread count');
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Start a conversation (creates initial message)
  static async startConversation(postData, giverData, collectorData, initialMessage) {
    try {
      // The collector sends the first message to the giver
      const response = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          receiverID: giverData.userID,
          postID: postData.postID,
          message: initialMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start conversation');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }
}

export default ChatService;