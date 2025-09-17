// client/src/utils/mockChatData.js
export const mockConversations = [
  {
    postID: 'post_001',
    postTitle: 'Plastic Bottles - 5kg',
    otherUserID: 'user_002',
    otherUserName: 'John Collector',
    otherUserType: 'Collector',
    lastMessage: 'I can pick up tomorrow at 3 PM',
    lastMessageTime: new Date('2025-01-15T10:00:00'),
    unreadCount: 2,
    postData: {
      title: 'Plastic Bottles - 5kg',
      wasteType: 'Plastic',
      amount: 5,
      unit: 'kg'
    }
  },
  {
    postID: 'post_002',
    postTitle: 'Old Electronics',
    otherUserID: 'user_003',
    otherUserName: 'Sarah Green',
    otherUserType: 'Giver',
    lastMessage: 'Perfect, see you then!',
    lastMessageTime: new Date('2025-01-14T15:30:00'),
    unreadCount: 0,
    postData: {
      title: 'Old Electronics',
      wasteType: 'E-waste',
      amount: 3,
      unit: 'items'
    }
  }
];

export const mockMessages = [
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
  },
  {
    messageID: 'msg_003',
    senderID: 'user_001',
    senderName: 'You',
    senderType: 'Giver',
    receiverID: 'user_002',
    postID: 'post_001',
    message: 'I\'m available weekdays after 2 PM',
    sentAt: new Date('2025-01-15T09:45:00'),
    messageType: 'text',
    isRead: true
  },
  {
    messageID: 'msg_004',
    senderID: 'user_002',
    senderName: 'John Collector',
    senderType: 'Collector',
    receiverID: 'user_001',
    postID: 'post_001',
    message: 'I can pick up tomorrow at 3 PM',
    sentAt: new Date('2025-01-15T10:00:00'),
    messageType: 'text',
    isRead: false
  }
];

// Mock chat service for testing
export const mockChatService = {
  getConversations: async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockConversations;
  },
  
  getConversation: async (user1ID, user2ID, postID) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockMessages.filter(msg => msg.postID === postID);
  },
  
  sendMessage: async (messageData) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      ...messageData,
      messageID: `msg_${Date.now()}`,
      sentAt: new Date(),
      isRead: false
    };
  }
};