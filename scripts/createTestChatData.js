// scripts/createTestChatData.js
// Run this from your backend: node scripts/createTestChatData.js

const { adminDb } = require('../config/firebase');
const Message = require('../models/Message');
const { v4: uuidv4 } = require('uuid');

async function createTestChatData() {
  try {
    console.log('Creating test chat data...');
    
    // You'll need to have some existing users and posts
    // Replace these IDs with actual IDs from your database
    const user1ID = 'test_user_1'; // Replace with actual user ID
    const user2ID = 'test_user_2'; // Replace with actual user ID
    const postID = 'test_post_1';   // Replace with actual post ID
    
    // Create some test messages
    const messages = [
      {
        senderID: user1ID,
        senderName: 'Test Giver',
        senderType: 'Giver',
        receiverID: user2ID,
        postID: postID,
        message: 'Hi, I have 5kg of plastic bottles available for pickup.',
        messageType: 'text',
        sentAt: new Date(Date.now() - 3600000), // 1 hour ago
        isRead: true
      },
      {
        senderID: user2ID,
        senderName: 'Test Collector',
        senderType: 'Collector',
        receiverID: user1ID,
        postID: postID,
        message: 'Great! When would be a good time for pickup?',
        messageType: 'text',
        sentAt: new Date(Date.now() - 3000000), // 50 mins ago
        isRead: true
      },
      {
        senderID: user1ID,
        senderName: 'Test Giver',
        senderType: 'Giver',
        receiverID: user2ID,
        postID: postID,
        message: 'I am available weekdays after 2 PM.',
        messageType: 'text',
        sentAt: new Date(Date.now() - 1800000), // 30 mins ago
        isRead: true
      },
      {
        senderID: user2ID,
        senderName: 'Test Collector',
        senderType: 'Collector',
        receiverID: user1ID,
        postID: postID,
        message: 'Perfect! I can come tomorrow at 3 PM. Here are the pickup details:',
        messageType: 'pickup_request',
        sentAt: new Date(Date.now() - 600000), // 10 mins ago
        isRead: false,
        metadata: {
          pickupTime: new Date(Date.now() + 86400000), // Tomorrow
          location: 'Main Gate, Building A',
          contactPerson: 'John Collector',
          contactNumber: '+1234567890',
          notes: 'Please have the items sorted by type'
        }
      }
    ];
    
    // Create messages in Firestore
    for (const messageData of messages) {
      const message = await Message.create(messageData);
      console.log(`Created message: ${message.messageID}`);
    }
    
    console.log('Test chat data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

// Run the script
createTestChatData();