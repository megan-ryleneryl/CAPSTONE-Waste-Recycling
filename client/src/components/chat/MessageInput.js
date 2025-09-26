// client/src/components/chat/MessageInput.js
import React, { useState, useRef, useEffect } from 'react';
import styles from './MessageInput.module.css';

const MessageInput = ({ 
  onSendMessage, 
  placeholder = "Type a message...",
  disabled = false,
  showPickupButton = false,
  onPickupRequest = null 
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.messageInput}>
      {showPickupButton && onPickupRequest && (
        <div className={styles.quickActions}>
          <button 
            className={styles.pickupButton}
            onClick={onPickupRequest}
            disabled={disabled}
          >
            📅 Schedule Pickup
          </button>
        </div>
      )}
      
      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className={styles.textarea}
          rows="1"
          maxLength={2000}
        />
        
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isSending || disabled}
          className={styles.sendButton}
          type="button"
        >
          {isSending ? (
            <span className={styles.sendingSpinner}>...</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
            </svg>
          )}
        </button>
      </div>
      
      {message.length > 1800 && (
        <div className={styles.charCount}>
          {2000 - message.length} characters remaining
        </div>
      )}
    </div>
  );
};

export default MessageInput;