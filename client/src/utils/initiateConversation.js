// client/src/utils/initiateConversation.js
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const initiateConversationForPost = async (postID, collectorUser, postOwnerID) => {
  try {
    // Get the post details
    const postDoc = await getDoc(doc(db, 'posts', postID));
    if (!postDoc.exists()) {
      console.error('Post not found');
      return null;
    }
    const postData = postDoc.data();

    // Get the post owner (giver) details
    const giverDoc = await getDoc(doc(db, 'users', postOwnerID));
    if (!giverDoc.exists()) {
      console.error('Giver not found');
      return null;
    }
    const giverData = giverDoc.data();

    // Create initial message from collector to giver
    const initialMessage = {
      messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderID: collectorUser.userID,
      senderName: `${collectorUser.firstName} ${collectorUser.lastName}`,
      receiverID: postOwnerID,
      receiverName: `${giverData.firstName} ${giverData.lastName}`,
      postID: postID,
      postTitle: postData.title,
      postType: postData.postType,
      message: `Hi ${giverData.firstName}! I saw your post "${postData.title}" and I'm interested in collecting these items. When would be a good time for pickup?`,
      messageType: 'text',
      isRead: false,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    const messageRef = await addDoc(collection(db, 'messages'), initialMessage);
    console.log('Initial message created:', messageRef.id);
    
    return messageRef.id;
  } catch (error) {
    console.error('Error initiating conversation:', error);
    return null;
  }
};

// Specific function for your current setup
export const initiateLukeKennethConversation = async () => {
  const postID = '29accd43-8a82-4a51-a218-8bc55a46a9db';
  const postOwnerID = '406e4494-4402-46a9-8291-47aba326803e'; // Kenneth
  const collectorUser = {
    userID: 'a8de495e-f4a2-45f6-8cf1-7a9401595082',
    firstName: 'Luke',
    lastName: 'Aniago'
  };

  return await initiateConversationForPost(postID, collectorUser, postOwnerID);
};