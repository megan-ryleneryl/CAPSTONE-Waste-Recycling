import React from 'react';
import MessageItem from './MessageItem';
import styles from './MessageList.module.css';

const MessageList = ({ messages, currentUser, className = '', messagesEndRef }) => {
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

        // Create a unique key - use messageID if available, otherwise use index with timestamp
        const uniqueKey = message.messageID || `msg-${index}-${message.sentAt?.seconds || Date.now()}`;

        return (
          <MessageItem
            key={uniqueKey}
            message={message}
            isOwn={message.senderID === currentUser.userID}
            isLastInGroup={isLastInGroup}
            isFirstInGroup={isFirstInGroup}
            showSenderName={isFirstInGroup && message.messageType !== 'system'}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;