import React from 'react';
import styles from './ChatHeader.module.css';

const ChatHeader = ({ otherUser, postData, onClose }) => {
  return (
    <div className={styles.chatHeader}>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {otherUser.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.details}>
          <h3 className={styles.userName}>{otherUser.name}</h3>
          <span className={styles.userType}>{otherUser.type}</span>
        </div>
      </div>

      {postData && (
        <div className={styles.postInfo}>
          <span className={styles.postTitle}>
            {postData.title || 'Mixed recyclables'}
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