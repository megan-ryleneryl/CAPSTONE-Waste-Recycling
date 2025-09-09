const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class MessageApiService {
  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    if (options.body && typeof options.body === 'object') {
      defaultOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Conversation operations
  static async getUserConversations() {
    return this.request('/messages/conversations');
  }

  static async getConversation(postID, otherUserID) {
    return this.request(`/messages/conversations/${postID}/${otherUserID}`);
  }

  static async markConversationAsRead(postID, otherUserID) {
    return this.request(`/messages/conversations/${postID}/${otherUserID}/read`, {
      method: 'PUT'
    });
  }

  // Message operations
  static async sendMessage(receiverID, postID, message) {
    return this.request('/messages/send', {
      method: 'POST',
      body: { receiverID, postID, message }
    });
  }

  static async sendPickupRequest(receiverID, postID, message, pickupDetails) {
    return this.request('/messages/pickup-request', {
      method: 'POST',
      body: { receiverID, postID, message, pickupDetails }
    });
  }

  // Utility
  static async getUnreadCount() {
    return this.request('/messages/unread-count');
  }

  // Your existing message methods can stay
  static async getAllMessages() {
    return this.request('/messages');
  }

  static async getMessageById(messageID) {
    return this.request(`/messages/${messageID}`);
  }

  static async deleteMessage(messageID) {
    return this.request(`/messages/${messageID}`, {
      method: 'DELETE'
    });
  }
}

export default MessageApiService;