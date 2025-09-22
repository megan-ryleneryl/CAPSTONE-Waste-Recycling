// components/Chat/ChatWindow.js - Updated for Message model
import React, { useState, useEffect, useRef } from 'react';
import ChatService from '../../services/chatService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import styles from './ChatWindow.module.css';
const [showPickupForm, setShowPickupForm] = useState(false);

const ChatWindow = ({ 
  postID,
  otherUser, // { userID, firstName, lastName, userType }
  currentUser, 
  onClose, 
  postData = null
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (postID && otherUser) {
      loadConversation();
      markAsRead();
    }
  }, [postID, otherUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const conversation = await ChatService.getConversation(
        currentUser.userID,
        otherUser.userID,
        postID
      );
      setMessages(conversation);
    } catch (err) {
      setError('Failed to load conversation');
      console.error('Error loading conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await ChatService.markConversationAsRead(
        currentUser.userID,
        otherUser.userID,
        postID
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    try {
      const newMessage = await ChatService.sendMessage(
        currentUser,
        otherUser.userID,
        postID,
        messageText
      );

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSchedulePickup = async (pickupDetails) => {
  try {
    await chatService.sendPickupRequest(
      currentUser,
      otherUser.userID,
      postID,
      'I would like to schedule a pickup for your recyclables',
      pickupDetails
    );
    setShowPickupForm(false);
    // Refresh messages
    loadMessages();
  } catch (error) {
    console.error('Failed to send pickup request:', error);
  }
};

  if (loading) {
    return (
      <div className={styles.chatWindow}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chatWindow}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={onClose} className={styles.closeButton}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chatWindow}>
      <ChatHeader 
        otherUser={otherUser} 
        postData={postData}
        onClose={onClose}
      />
      
      <MessageList 
        messages={messages}
        currentUser={currentUser}
        className={styles.messagesList}
      />
      
      <div ref={messagesEndRef} />
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        placeholder={`Message ${otherUser.firstName}...`}
        showPickupButton={currentUser.userType === 'Collector'}
        onPickupRequest={() => setShowPickupForm(true)}
      />

      {showPickupForm && (
        <PickupScheduleForm
          onSubmit={handleSchedulePickup}
          onCancel={() => setShowPickupForm(false)}
          giverPreferences={postData?.pickupPreferences}
        />
      )}
    </div>
  );
};

export default ChatWindow;