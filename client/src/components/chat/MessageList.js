import React from 'react';
import MessageItem from './MessageItem';
import styles from './MessageList.module.css';

const MessageList = ({ messages, currentUser, className = '' }) => {
  if (messages.length === 0) {
    return (
      <div className={`${styles.messagesList} ${className}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💬</div>
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messagesList} ${className}`}>
      {messages.map((message, index) => {
        const isLastInGroup = index === messages.length - 1 || 
          messages[index + 1]?.senderID !== message.senderID;
        const isFirstInGroup = index === 0 || 
          messages[index - 1]?.senderID !== message.senderID;

        return (
          <MessageItem
            key={message.messageID}
            message={message}
            isOwn={message.senderID === currentUser.userID}
            isLastInGroup={isLastInGroup}
            isFirstInGroup={isFirstInGroup}
            showSenderName={isFirstInGroup && message.messageType !== 'system'}
          />
        );
      })}
    </div>
  );
};

export default MessageList;