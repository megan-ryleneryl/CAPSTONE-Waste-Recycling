import React from 'react';
import { formatMessageTime } from '../../utils/dateHelpers';
import styles from './MessageItem.module.css';

const MessageItem = ({ 
  message, 
  currentUser, 
  isLastInGroup, 
  isFirstInGroup, 
  showSenderName 
}) => {
  const isOwn = message.senderID === currentUser.userID;
  const isSystem = message.messageType === 'system';
  
  const messageClasses = [
    styles.messageItem,
    isOwn ? styles.own : styles.other,
    isLastInGroup ? styles.lastInGroup : '',
    isFirstInGroup ? styles.firstInGroup : '',
    isSystem ? styles.system : ''
  ].filter(Boolean).join(' ');

  if (isSystem) {
    return (
      <div className={styles.systemMessage}>
        <span className={styles.systemText}>{message.message}</span>
        <span className={styles.systemTime}>
          {formatMessageTime(message.sentAt)}
        </span>
      </div>
    );
  }

  const isPickupRequest = message.messageType === 'pickup_request';

  return (
    <div className={messageClasses}>
      {showSenderName && !isOwn && (
        <div className={styles.senderName}>
          {message.senderName}
          <span className={styles.senderType}>({message.senderType})</span>
        </div>
      )}
      
      <div className={styles.messageContent}>
        <div className={`${styles.messageText} ${isPickupRequest ? styles.pickupRequest : ''}`}>
          {message.message}
          
          {isPickupRequest && message.metadata && (
            <div className={styles.pickupDetails}>
              {message.metadata.pickupTime && (
                <div className={styles.pickupItem}>
                  <strong>Time:</strong> {new Date(message.metadata.pickupTime).toLocaleDateString()}
                </div>
              )}
              {message.metadata.location && (
                <div className={styles.pickupItem}>
                  <strong>Location:</strong> {message.metadata.location}
                </div>
              )}
              {message.metadata.contactPerson && (
                <div className={styles.pickupItem}>
                  <strong>Contact:</strong> {message.metadata.contactPerson}
                </div>
              )}
            </div>
          )}
        </div>
        
        {isLastInGroup && (
          <div className={styles.messageFooter}>
            <span className={styles.timestamp}>
              {formatMessageTime(message.sentAt)}
            </span>
            {isOwn && (
              <span className={styles.readStatus}>
                {message.isRead ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;