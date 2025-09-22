const { adminDb } = require('../config/firebase');
const Message = require('../models/Message');

async function createTestChatForLuke() {
  const lukeID = 'a8de495e-f4a2-45f6-8cf1-7a9401595082'; // Luke's ID from your screenshot
  
  // You'll need another user - create one or use existing
  const testCollectorID = 'test-collector-' + Date.now();
  const testPostID = 'test-post-' + Date.now();
  
  // Create test messages
  const messages = [
    {
      senderID: testCollectorID,
      senderName: 'Test Collector',
      senderType: 'Collector',
      receiverID: lukeID,
      postID: testPostID,
      message: 'Hi Luke! I saw your waste post for plastic bottles. I can pick them up tomorrow.',
      messageType: 'text',
      sentAt: new Date(Date.now() - 3600000),
      isRead: false
    },
    {
      senderID: lukeID,
      senderName: 'Luke Aniago',
      senderType: 'Giver',
      receiverID: testCollectorID,
      postID: testPostID,
      message: 'Great! I have about 10kg ready. When can you come?',
      messageType: 'text',
      sentAt: new Date(Date.now() - 1800000),
      isRead: true
    },
    {
      senderID: testCollectorID,
      senderName: 'Test Collector',
      senderType: 'Collector',
      receiverID: lukeID,
      postID: testPostID,
      message: 'I can schedule a pickup for tomorrow at 3 PM. Here are the details:',
      messageType: 'pickup_request',
      sentAt: new Date(Date.now() - 600000),
      isRead: false,
      metadata: {
        pickupTime: new Date(Date.now() + 86400000),
        location: 'Front gate',
        contactPerson: 'John Doe',
        contactNumber: '09123456789',
        notes: 'Please have items sorted by type'
      }
    }
  ];
  
  for (const msg of messages) {
    await Message.create(msg);
    console.log(`Created message: ${msg.message.substring(0, 30)}...`);
  }
  
  console.log('Test chat created for Luke!');
}

createTestChatForLuke();