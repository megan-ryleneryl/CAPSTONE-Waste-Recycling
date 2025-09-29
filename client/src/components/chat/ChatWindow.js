// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import PickupScheduleForm from './PickupScheduleForm';
import PickupCard from './PickupCard';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import pickupService from '../../services/pickupService';
import { chatService } from '../../config/services';
import styles from './ChatWindow.module.css';

const ChatWindow = ({ currentUser, post }) => {
  const { postID, otherUserID } = useParams();
  const [messages, setMessages] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [activePickup, setActivePickup] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatData();
    // Subscribe to pickup updates
    const unsubscribe = pickupService.subscribeToUserPickups(
      currentUser.userID,
      currentUser.userType === 'Collector' ? 'collector' : 'giver',
      (pickups) => {
        const pickup = pickups.find(p => p.postID === postID);
        setActivePickup(pickup || null);
      }
    );

    return () => unsubscribe();
  }, [postID, otherUserID, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      // Load messages from Firebase
      const messagesData = await chatService.getMessages(postID, otherUserID);
      const userInfo = await chatService.getUserInfo(otherUserID);
      
      setMessages(messagesData);
      setOtherUser(userInfo);
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const newMessage = {
      senderID: currentUser.userID,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      receiverID: otherUserID,
      postID,
      message: messageText,
      messageType: 'text'
    };

    try {
      await chatService.sendMessage(newMessage);
      // Message will be added via real-time listener
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSchedulePickup = async (formData) => {
    const pickupData = {
      postID,
      postType: post?.postType || 'Waste',
      postTitle: post?.title || 'Waste Post',
      giverID: post?.userID || otherUserID,
      giverName: otherUser?.name || 'Unknown',
      collectorID: currentUser.userID,
      collectorName: `${currentUser.firstName} ${currentUser.lastName}`,
      proposedBy: currentUser.userID,
      ...formData
    };

    const result = await pickupService.createPickup(pickupData);
    
    if (result.success) {
      setShowScheduleForm(false);
      // Send system message
      await sendMessage(`Pickup scheduled for ${formData.pickupDate} at ${formData.pickupTime}`);
    } else {
      alert('Failed to schedule pickup. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {otherUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className={styles.userName}>{otherUser?.name || 'Unknown User'}</h3>
            <p className={styles.postTitle}>{post?.title || 'Loading...'}</p>
          </div>
        </div>
        
        {!activePickup && currentUser.userType === 'Collector' && (
          <button
            onClick={() => setShowScheduleForm(true)}
            className={styles.scheduleButton}
          >
            📅 Schedule Pickup
          </button>
        )}
      </div>

      {activePickup && (
        <PickupCard 
          pickup={activePickup} 
          currentUser={currentUser}
          onUpdateStatus={async (status) => {
            await pickupService.updatePickupStatus(activePickup.pickupID, status);
          }}
        />
      )}

      <MessageList 
        messages={messages} 
        currentUser={currentUser} 
        className={styles.messagesList}
      />
      
      <div ref={messagesEndRef} />

      <MessageInput 
        onSendMessage={sendMessage}
        disabled={!otherUser}
      />

      {showScheduleForm && (
        <PickupScheduleForm
          post={post}
          giverPreferences={otherUser?.preferences}
          onSubmit={handleSchedulePickup}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;