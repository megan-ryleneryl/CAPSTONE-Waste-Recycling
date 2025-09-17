// client/src/components/chat/ChatHeader.js
import React from 'react';
import styles from './ChatHeader.module.css';

const ChatHeader = ({ otherUser, postData, onClose }) => {
  // Handle different user object structures
  const getUserName = (user) => {
    if (user.name) return user.name;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    return 'Unknown User';
  };

  const getUserType = (user) => {
    return user.userType || user.type || 'User';
  };

  const userName = getUserName(otherUser);
  const userType = getUserType(otherUser);

  return (
    <div className={styles.chatHeader}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className={styles.details}>
          <h3 className={styles.userName}>{userName}</h3>
          <span className={styles.userType}>{userType}</span>
        </div>
      </div>

      {postData && (
        <div className={styles.postInfo}>
          <span className={styles.postTitle}>
            {postData.title || postData.description || 'Mixed recyclables'}
          </span>
        </div>
      )}

      <button onClick={onClose} className={styles.closeButton}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
};

export default ChatHeader;