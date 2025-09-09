import React, { useState, useRef, useEffect } from 'react';
import styles from './MessageInput.module.css';

const MessageInput = ({ onSendMessage, placeholder = 'Type a message...' }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      resetTextareaHeight();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const resetTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <form onSubmit={handleSubmit} className={styles.messageInput}>
      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={styles.textarea}
          rows={1}
        />
        
        <button 
          type="submit" 
          className={styles.sendButton}
          disabled={!message.trim()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
          </svg>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;