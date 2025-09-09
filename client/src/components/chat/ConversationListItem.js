import React from 'react';
import { formatMessageTime } from '../../utils/dateHelpers';
import styles from './ConversationListItem.module.css';

const ConversationListItem = ({ 
  conversation, 
  currentUser, 
  onClick, 
  isSelected = false,
  otherUserData = null // You'll need to fetch this or pass it
}) => {
  const { postID, otherUserID, lastMessage, unreadCount } = conversation;
  const hasUnread = unreadCount > 0;
  
  // You'll need to get other user data somehow - either pass it or fetch it
  const otherUserName = otherUserData ? 
    `${otherUserData.firstName} ${otherUserData.lastName}` : 
    'User';
  const otherUserType = otherUserData?.userType || 'User';

  return (
    <div 
      className={`${styles.conversationItem} ${isSelected ? styles.selected : ''} ${hasUnread ? styles.unread : ''}`}
      onClick={() => onClick(conversation)}
    >
      <div className={styles.avatar}>
        {otherUserName.charAt(0).toUpperCase()}
      </div>
      
      <div className={styles.conversationInfo}>
        <div className={styles.header}>
          <span className={styles.userName}>{otherUserName}</span>
          <span className={styles.userType}>({otherUserType})</span>
          {hasUnread && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
        
        <div className={styles.postInfo}>
          Post: {postID}
        </div>
        
        <div className={styles.lastMessage}>
          {lastMessage?.message || 'No messages yet'}
        </div>
        
        <div className={styles.timestamp}>
          {lastMessage?.sentAt && formatMessageTime(lastMessage.sentAt)}
        </div>
      </div>
    </div>
  );
};

export default ConversationListItem;