// client/src/components/chat/ConversationListItem.js
import React from 'react';
import styles from './ConversationListItem.module.css';

const ConversationListItem = ({ 
  conversation, 
  currentUser, 
  onClick, 
  isSelected 
}) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    let messageDate;
    
    try {
      // Handle Firestore Timestamp objects
      if (timestamp?.seconds) {
        // Firestore Timestamp format with seconds
        messageDate = new Date(timestamp.seconds * 1000);
      } else if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
        // Firestore Timestamp with toDate method
        messageDate = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        // String date
        messageDate = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        // Already a Date object
        messageDate = timestamp;
      } else {
        // Try to parse it anyway
        try {
          messageDate = new Date(timestamp);
        } catch (e) {
          console.error('Invalid timestamp format:', timestamp);
          return '';
        }
      }
    } catch (error) {
      console.error('Error parsing timestamp:', error);
      return '';
    }
    
    // Check if date is valid
    if (!messageDate || isNaN(messageDate.getTime())) {
      console.error('Invalid date after conversion:', timestamp);
      return '';
    }
    
    const now = new Date();
    const diffMs = now - messageDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // More accurate time display
    if (diffSeconds < 60) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    
    // For older messages, show the actual date
    const options = { month: 'short', day: 'numeric' };
    if (messageDate.getFullYear() !== now.getFullYear()) {
      options.year = 'numeric';
    }
    return messageDate.toLocaleDateString('en-US', options);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(conversation);
    }
  };

  // Get display info from conversation
  const otherUserName = conversation.otherUserName || 'Unknown User';
  const otherUserProfilePicture = conversation.otherUserProfilePicture;
  const lastMessage = conversation.lastMessage || {};
  const messageText = lastMessage.message || 'No messages yet';
  const lastMessageTime = lastMessage.sentAt;
  const unreadCount = conversation.unreadCount || 0;
  const postTitle = conversation.postTitle || 'Untitled Post';
  const postStatus = conversation.postStatus || 'Unknown';

  // Check if last message is from current user
  const isOwnMessage = lastMessage.senderID === currentUser?.userID;

  // Get status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return styles.statusActive;
      case 'Claimed':
        return styles.statusClaimed;
      case 'Completed':
        return styles.statusCompleted;
      case 'Cancelled':
        return styles.statusCancelled;
      case 'Locked':
        return styles.statusLocked;
      case 'Hidden':
        return styles.statusHidden;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <div
      className={`${styles.conversationItem} ${isSelected ? styles.selected : ''} ${unreadCount > 0 ? styles.unread : ''}`}
      onClick={handleClick}
    >
      <div className={styles.avatar}>
        {otherUserProfilePicture ? (
          <img
            src={otherUserProfilePicture}
            alt={otherUserName}
            className={styles.avatarImage}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.textContent = otherUserName.charAt(0).toUpperCase();
            }}
          />
        ) : (
          otherUserName.charAt(0).toUpperCase()
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h4 className={styles.userName}>{otherUserName}</h4>
          <span className={styles.time}>
            {formatTime(lastMessageTime)}
          </span>
        </div>

        <div className={styles.postTitleRow}>
          <div className={styles.postTitle}>{postTitle}</div>
          <span className={`${styles.statusBadge} ${getStatusBadgeClass(postStatus)}`}>
            {postStatus}
          </span>
        </div>

        <div className={styles.lastMessage}>
          <span className={styles.messagePreview}>
            {isOwnMessage ? 'You: ' : ''}
            {messageText.length > 50
              ? `${messageText.substring(0, 50)}...`
              : messageText}
          </span>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationListItem;