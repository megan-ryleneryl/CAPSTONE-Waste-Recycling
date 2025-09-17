// client/src/services/mockChatService.js
// Use this for development/testing when backend is not available

class MockChatService {
  static conversations = [
    {
      postID: 'post_001',
      postTitle: 'Plastic Bottles - 5kg',
      otherUserID: 'user_002',
      otherUserName: 'John Collector',
      otherUserType: 'Collector',
      lastMessage: 'I can pick up tomorrow at 3 PM',
      lastMessageTime: new Date('2025-01-15T10:00:00'),
      unreadCount: 2
    },
    {
      postID: 'post_002',
      postTitle: 'Old Electronics',
      otherUserID: 'user_003',
      otherUserName: 'Sarah Green',
      otherUserType: 'Giver',
      lastMessage: 'Perfect, see you then!',
      lastMessageTime: new Date('2025-01-14T15:30:00'),
      unreadCount: 0
    }
  ];

  static messages = {
    'post_001': [
      {
        messageID: 'msg_001',
        senderID: 'user_001',
        senderName: 'You',
        senderType: 'Giver',
        receiverID: 'user_002',
        postID: 'post_001',
        message: 'Hi, I have 5kg of plastic bottles available for pickup',
        sentAt: new Date('2025-01-15T09:00:00'),
        messageType: 'text',
        isRead: true
      },
      {
        messageID: 'msg_002',
        senderID: 'user_002',
        senderName: 'John Collector',
        senderType: 'Collector',
        receiverID: 'user_001',
        postID: 'post_001',
        message: 'Great! When would be a good time for pickup?',
        sentAt: new Date('2025-01-15T09:30:00'),
        messageType: 'text',
        isRead: true
      }
    ],
    'post_002': [
      {
        messageID: 'msg_003',
        senderID: 'user_001',
        senderName: 'You',
        senderType: 'Collector',
        receiverID: 'user_003',
        postID: 'post_002',
        message: 'I can collect the electronics tomorrow',
        sentAt: new Date('2025-01-14T14:00:00'),
        messageType: 'text',
        isRead: true
      },
      {
        messageID: 'msg_004',
        senderID: 'user_003',
        senderName: 'Sarah Green',
        senderType: 'Giver',
        receiverID: 'user_001',
        postID: 'post_002',
        message: 'Perfect, see you then!',
        sentAt: new Date('2025-01-14T15:30:00'),
        messageType: 'text',
        isRead: true
      }
    ]
  };

  static async getUserConversations(userID) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.conversations;
  }

  static async getConversation(user1ID, user2ID, postID) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.messages[postID] || [];
  }

  static async sendMessage(senderData, receiverID, postID, messageText) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newMessage = {
      messageID: `msg_${Date.now()}`,
      senderID: senderData.userID,
      senderName: `${senderData.firstName} ${senderData.lastName}`,
      senderType: senderData.userType,
      receiverID,
      postID,
      message: messageText,
      sentAt: new Date(),
      messageType: 'text',
      isRead: false
    };

    // Add to mock data
    if (!this.messages[postID]) {
      this.messages[postID] = [];
    }
    this.messages[postID].push(newMessage);

    return newMessage;
  }

  static async sendPickupRequest(senderData, receiverID, postID, messageText, pickupDetails) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newMessage = {
      messageID: `msg_${Date.now()}`,
      senderID: senderData.userID,
      senderName: `${senderData.firstName} ${senderData.lastName}`,
      senderType: senderData.userType,
      receiverID,
      postID,
      message: messageText,
      sentAt: new Date(),
      messageType: 'pickup_request',
      isRead: false,
      metadata: pickupDetails
    };

    if (!this.messages[postID]) {
      this.messages[postID] = [];
    }
    this.messages[postID].push(newMessage);

    return newMessage;
  }

  static async markConversationAsRead(userID, otherUserID, postID) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update mock data
    const conversation = this.conversations.find(c => c.postID === postID);
    if (conversation) {
      conversation.unreadCount = 0;
    }
    
    return true;
  }

  static async getUnreadCount(userID) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  }

  static async startConversation(postData, giverData, collectorData, initialMessage) {
    return this.sendMessage(collectorData, giverData.userID, postData.postID, initialMessage);
  }
}

export default MockChatService;