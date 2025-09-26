// client/src/components/chat/ConversationList.js
import React, { useState, useEffect } from 'react';
import { chatService } from '../../config/services'; // Use configured service
import ConversationListItem from './ConversationListItem';
import styles from './ConversationList.module.css';

const ConversationList = ({ 
  currentUser, 
  onSelectConversation, 
  selectedConversationId 
}) => {
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
      const data = await chatService.getUserConversations(currentUser.userID);
      setConversations(data || []);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
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

  if (error && !conversations.length) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.header}>
          <h2>Messages</h2>
        </div>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadConversations} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!conversations.length) {
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
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💬</div>
          <p>No conversations yet</p>
          <span className={styles.emptyHint}>
            Messages will appear here when you start chatting
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
            key={`${conversation.postID}-${conversation.otherUserID}`}
            conversation={conversation}
            currentUser={currentUser}
            onClick={handleConversationSelect}
            isSelected={
              selectedConversationId === `${conversation.postID}-${conversation.otherUserID}`
            }
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationList;