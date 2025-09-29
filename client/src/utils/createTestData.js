// client/src/utils/createTestData.js
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const createTestConversation = async (currentUser) => {
  try {
    // Create a test post first
    const testPost = {
      postID: `test-post-${Date.now()}`,
      title: 'Test Plastic Bottles - 10kg',
      postType: 'Waste',
      wasteType: 'Plastic',
      amount: 10,
      unit: 'kg',
      description: 'Clean plastic bottles ready for pickup',
      userID: 'test-giver-123',
      userName: 'Test Giver',
      status: 'active',
      createdAt: serverTimestamp()
    };

    const postRef = await addDoc(collection(db, 'posts'), testPost);
    
    // Create a test message
    const testMessage = {
      senderID: 'test-giver-123',
      senderName: 'Test Giver',
      senderType: 'Giver',
      receiverID: currentUser.userID,
      postID: postRef.id,
      message: 'Hi! I saw your waste post for plastic bottles. I can pick them up tomorrow.',
      messageType: 'text',
      isRead: false,
      sentAt: serverTimestamp()
    };

    await addDoc(collection(db, 'messages'), testMessage);
    
    console.log('Test conversation created successfully!');
    return postRef.id;
  } catch (error) {
    console.error('Error creating test conversation:', error);
  }
};