// client/src/components/chat/ConversationListItem.js
import React from 'react';
import styles from './ConversationListItem.module.css';

const ConversationListItem = ({ 
  conversation, 
  currentUser, 
  onClick, 
  isSelected 
}) => {
  const formatTime = (date) => {
    if (!date) return '';
    
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageDate.toLocaleDateString();
  };

  const handleClick = () => {
    if (onClick) {
      onClick(conversation);
    }
  };

  // Get display info from conversation
  const otherUserName = conversation.otherUserName || 'Unknown User';
  const lastMessage = conversation.lastMessage || {};
  const messageText = lastMessage.message || 'No messages yet';
  const lastMessageTime = lastMessage.sentAt;
  const unreadCount = conversation.unreadCount || 0;
  const postTitle = conversation.postTitle || 'Untitled Post';

  return (
    <div 
      className={`${styles.conversationItem} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
    >
      <div className={styles.avatar}>
        {otherUserName.charAt(0).toUpperCase()}
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h4 className={styles.userName}>{otherUserName}</h4>
          <span className={styles.time}>
            {formatTime(lastMessageTime)}
          </span>
        </div>
        
        <div className={styles.postTitle}>{postTitle}</div>
        
        <div className={styles.lastMessage}>
          <span className={styles.messagePreview}>
            {messageText.length > 50 
              ? messageText.substring(0, 50) + '...' 
              : messageText}
          </span>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationListItem;