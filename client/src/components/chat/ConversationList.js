// client/src/components/chat/ConversationList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, or } from 'firebase/firestore';
import { db } from '../../services/firebase';
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
      
      // Process received messages
      receivedSnapshot.docs.forEach(doc => {
        const msg = { id: doc.id, ...doc.data() };
        const key = `${msg.postID}-${msg.senderID}`;
        
        if (!conversationsMap.has(key) || 
            (msg.sentAt?.toDate() > conversationsMap.get(key).lastMessage.sentAt?.toDate())) {
          conversationsMap.set(key, {
            id: key,
            postID: msg.postID,
            postTitle: msg.postTitle || 'Unknown Post',
            otherUserID: msg.senderID,
            otherUserName: msg.senderName || 'Unknown User',
            lastMessage: msg,
            unreadCount: msg.isRead ? 0 : 1
          });
        }
      });
      
      // Process sent messages
      sentSnapshot.docs.forEach(doc => {
        const msg = { id: doc.id, ...doc.data() };
        const key = `${msg.postID}-${msg.receiverID}`;
        
        if (!conversationsMap.has(key) || 
            (msg.sentAt?.toDate() > conversationsMap.get(key).lastMessage.sentAt?.toDate())) {
          conversationsMap.set(key, {
            id: key,
            postID: msg.postID,
            postTitle: msg.postTitle || 'Unknown Post',
            otherUserID: msg.receiverID,
            otherUserName: msg.receiverName || 'Unknown User',
            lastMessage: msg,
            unreadCount: 0 // Sent messages are always read
          });
        }
      });
      
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
          <div className={styles.emptyIcon}>💬</div>
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
          🔄
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