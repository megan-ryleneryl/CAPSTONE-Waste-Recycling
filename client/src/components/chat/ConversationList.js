// client/src/components/chat/ConversationList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MessageCircle, RefreshCw } from 'lucide-react';
import ConversationListItem from './ConversationListItem';
import styles from './ConversationList.module.css';

const ConversationList = ({ currentUser, onSelectConversation, selectedConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.userID) {
      loadConversations();
      // Refresh conversations every 30 seconds
      const interval = setInterval(loadConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

const loadConversations = async () => {
  try {
    setError('');
    
    // Query messages where current user is sender OR receiver
    const messagesRef = collection(db, 'messages');
    
    // Get messages where user is receiver
    const receivedQuery = query(
      messagesRef,
      where('receiverID', '==', currentUser.userID),
      orderBy('sentAt', 'desc'),
      limit(50)
    );
    
    // Get messages where user is sender
    const sentQuery = query(
      messagesRef,
      where('senderID', '==', currentUser.userID),
      orderBy('sentAt', 'desc'),
      limit(50)
    );
    
    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQuery),
      getDocs(sentQuery)
    ]);
    
    // Group messages by conversation (postID + otherUserID)
    const conversationsMap = new Map();
    
    // Helper function to fetch user data
    const fetchUserData = async (userID) => {
      try {
        const userDocRef = doc(db, 'users', userID);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User',
            profilePicture: userData.profilePictureUrl || null
          };
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
      return {
        name: 'Unknown User',
        profilePicture: null
      };
    };
    
    // Helper function to fetch post data
    const fetchPostData = async (postID) => {
      try {
        const postDocRef = doc(db, 'posts', postID);
        const postDoc = await getDoc(postDocRef);
        if (postDoc.exists()) {
          const postData = postDoc.data();
          return postData.title || 'Untitled Post';
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      }
      return 'Unknown Post';
    };
    
    // Process received messages
    for (const doc of receivedSnapshot.docs) {
      const msg = { id: doc.id, ...doc.data() };
      const key = `${msg.postID}-${msg.senderID}`;

      // Fetch missing data if needed
      let userData = { name: msg.senderName, profilePicture: null };
      let postTitle = msg.postTitle;

      if (!msg.senderName || msg.senderName === 'Unknown User') {
        userData = await fetchUserData(msg.senderID);
      } else {
        // Still fetch user data to get profile picture
        const fullUserData = await fetchUserData(msg.senderID);
        userData.profilePicture = fullUserData.profilePicture;
      }

      if (!postTitle || postTitle === 'Unknown Post') {
        postTitle = await fetchPostData(msg.postID);
      }

      if (!conversationsMap.has(key) ||
          (msg.sentAt?.toDate() > conversationsMap.get(key).lastMessage.sentAt?.toDate())) {
        conversationsMap.set(key, {
          id: key,
          postID: msg.postID,
          postTitle: postTitle,
          otherUserID: msg.senderID,
          otherUserName: userData.name,
          otherUserProfilePicture: userData.profilePicture,
          lastMessage: msg,
          unreadCount: msg.isRead ? 0 : 1
        });
      }
    }
    
    // Process sent messages
    for (const doc of sentSnapshot.docs) {
      const msg = { id: doc.id, ...doc.data() };
      const key = `${msg.postID}-${msg.receiverID}`;

      // Fetch missing data if needed
      let userData = { name: msg.receiverName, profilePicture: null };
      let postTitle = msg.postTitle;

      if (!msg.receiverName || msg.receiverName === 'Unknown User') {
        userData = await fetchUserData(msg.receiverID);
      } else {
        // Still fetch user data to get profile picture
        const fullUserData = await fetchUserData(msg.receiverID);
        userData.profilePicture = fullUserData.profilePicture;
      }

      if (!postTitle || postTitle === 'Unknown Post') {
        postTitle = await fetchPostData(msg.postID);
      }

      if (!conversationsMap.has(key) ||
          (msg.sentAt?.toDate() > conversationsMap.get(key).lastMessage.sentAt?.toDate())) {
        conversationsMap.set(key, {
          id: key,
          postID: msg.postID,
          postTitle: postTitle,
          otherUserID: msg.receiverID,
          otherUserName: userData.name,
          otherUserProfilePicture: userData.profilePicture,
          lastMessage: msg,
          unreadCount: 0 // Sent messages are always read
        });
      }
    }
    
    // Convert to array and sort by most recent
    const conversationsList = Array.from(conversationsMap.values())
      .sort((a, b) => {
        const aTime = a.lastMessage.sentAt?.toDate() || new Date(0);
        const bTime = b.lastMessage.sentAt?.toDate() || new Date(0);
        return bTime - aTime;
      });
    
    setConversations(conversationsList);
  } catch (err) {
    setError('Failed to load conversations');
    console.error('Error loading conversations:', err);
  } finally {
    setLoading(false);
  }
};

  if (loading && !conversations.length) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.header}>
          <h2>Messages</h2>
        </div>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.header}>
          <h2>Messages</h2>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MessageCircle size={48} strokeWidth={1.5} />
          </div>
          <p>No conversations yet</p>
          <span className={styles.emptyHint}>
            Start by messaging someone about their post
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.conversationList}>
      <div className={styles.header}>
        <h2>Messages</h2>
        <button
          onClick={loadConversations}
          className={styles.refreshButton}
          title="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className={styles.conversationItems}>
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            currentUser={currentUser}
            onClick={onSelectConversation}
            isSelected={selectedConversationId === conversation.id}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationList;