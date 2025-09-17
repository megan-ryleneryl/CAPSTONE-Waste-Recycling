// client/src/components/chat/ConversationList.js
import React, { useState, useEffect } from 'react';
import ConversationListItem from './ConversationListItem';
import ChatService from '../../services/chatService';
import styles from './ConversationList.module.css';

const ConversationList = ({ currentUser, onSelectConversation, selectedConversationId = null }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
  }, [currentUser.userID]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await ChatService.getUserConversations(currentUser.userID);
      setConversations(userConversations);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversation) => {
    onSelectConversation(conversation);
  };

  if (loading) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={loadConversations} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={styles.conversationList}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💬</div>
          <h3>No conversations yet</h3>
          <p>Your conversations will appear here when you start chatting with other users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.conversationList}>
      <div className={styles.header}>
        <h2>Messages</h2>
        <button onClick={loadConversations} className={styles.refreshButton} title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="m3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      <div className={styles.conversationItems}>
        {conversations.map((conversation) => (
          <ConversationListItem
            key={`${conversation.postID}-${conversation.otherUserID}`}
            conversation={conversation}
            currentUser={currentUser}
            onClick={handleConversationSelect}
            isSelected={selectedConversationId === `${conversation.postID}-${conversation.otherUserID}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationList;