import React from 'react';
import { formatMessageTime } from '../../utils/dateHelpers';
import styles from './ChatListItem.module.css';

const ChatListItem = ({ chatRoom, currentUser, onClick, isSelected = false }) => {
  const isGiver = chatRoom.giverID === currentUser.userID;
  const otherUser = isGiver 
    ? { name: chatRoom.collectorName, type: 'Collector' }
    : { name: chatRoom.giverName, type: 'Giver' };

  const unreadCount = isGiver ? chatRoom.unreadCount.giver : chatRoom.unreadCount.collector;
  const hasUnread = unreadCount > 0;

  return (
    <div 
      className={`${styles.chatListItem} ${isSelected ? styles.selected : ''} ${hasUnread ? styles.unread : ''}`}
      onClick={() => onClick(chatRoom)}
    >
      <div className={styles.avatar}>
        {otherUser.name.charAt(0).toUpperCase()}
      </div>
      
      <div className={styles.chatInfo}>
        <div className={styles.header}>
          <span className={styles.userName}>{otherUser.name}</span>
          <span className={styles.userType}>
            ({otherUser.isAdmin ? 'Admin' : otherUser.isCollector ? 'Collector' : 'Giver'})
          </span>
          {hasUnread && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
        
        <div className={styles.lastMessage}>
          {chatRoom.lastMessage || 'No messages yet'}
        </div>
        
        <div className={styles.timestamp}>
          {chatRoom.lastMessageTime && formatMessageTime(chatRoom.lastMessageTime)}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;