// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import PickupScheduleForm from './PickupScheduleForm';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import styles from './ChatWindow.module.css';
// Note: Icons can be replaced with emoji or custom SVG if lucide-react is not installed


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
  }, [postID, otherUserID]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      // Load messages, other user info, and active pickup
      // Replace with actual API calls
      const messagesData = await fetchMessages(postID, otherUserID);
      const userInfo = await fetchUserInfo(otherUserID);
      const pickup = await fetchActivePickup(postID);
      
      setMessages(messagesData);
      setOtherUser(userInfo);
      setActivePickup(pickup);
    } catch (error) {
      console.error('Error loading chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (postID, otherUserID) => {
    // Replace with actual API call
    return [];
  };

  const fetchUserInfo = async (userID) => {
    // Replace with actual API call
    return {
      userID,
      firstName: 'John',
      lastName: 'Doe',
      userType: 'Collector'
    };
  };

  const fetchActivePickup = async (postID) => {
    // Replace with actual API call
    return null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const newMessage = {
      messageID: Date.now().toString(),
      senderID: currentUser.userID,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      senderType: currentUser.userType,
      receiverID: otherUserID,
      postID,
      message: messageText,
      sentAt: new Date(),
      messageType: 'text',
      isRead: false
    };

    try {
      // Replace with actual API call
      setMessages(prev => [...prev, newMessage]);
      
      // Here you would typically send to your backend
      // await messageService.sendMessage(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSchedulePickup = async (scheduleData) => {
    try {
      // Replace with actual API call to create pickup
      console.log('Creating pickup with data:', scheduleData);
      
      // Send system message about pickup
      const systemMessage = {
        messageID: 'sys_' + Date.now(),
        senderID: 'system',
        messageType: 'pickup_request',
        message: 'Pickup has been scheduled',
        metadata: scheduleData,
        sentAt: new Date()
      };
      
      setMessages(prev => [...prev, systemMessage]);
      setShowScheduleForm(false);
      
      // Refresh pickup status
      const newPickup = await fetchActivePickup(postID);
      setActivePickup(newPickup);
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      alert('Failed to schedule pickup. Please try again.');
    }
  };

  // Format time helper function
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    let hours = d.getHours();
    let minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      {/* Chat Header */}
      <div className={styles.chatHeader}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {otherUser?.firstName?.charAt(0) || '?'}
          </div>
          <div className={styles.userDetails}>
            <h3>{otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Loading...'}</h3>
            <p className={styles.userType}>
              {otherUser?.userType} • {post?.title || 'Post'}
            </p>
          </div>
        </div>
        
        {/* Schedule Pickup Button (for Collectors on Waste posts) */}
        {currentUser?.userType === 'Collector' && 
         post?.postType === 'Waste' && 
         !activePickup && (
          <button
            onClick={() => setShowScheduleForm(true)}
            className={styles.scheduleBtn}
          >
            📅 Schedule Pickup
          </button>
        )}
      </div>

      {/* Pickup Status Banner */}
      {activePickup && (
        <div className={styles.pickupBanner}>
          <div className={styles.pickupInfo}>
            <span className={styles.pickupStatus}>
              {activePickup.status === 'Proposed' && '⏳'}
              {activePickup.status === 'Confirmed' && '✅'}
              {activePickup.status === 'In-Progress' && '🚛'}
              {activePickup.status === 'Completed' && '✓'}
              Pickup {activePickup.status}
            </span>
            <span className={styles.pickupDetails}>
              {activePickup.pickupDate} at {activePickup.pickupTime} • {activePickup.pickupLocation}
            </span>
          </div>
          
          {/* Action buttons based on status and user type */}
          {activePickup.status === 'Proposed' && currentUser?.userType === 'Giver' && (
            <div className={styles.pickupActions}>
              <button className={styles.confirmBtn}>Confirm</button>
              <button className={styles.declineBtn}>Decline</button>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <MessageList 
            messages={messages}
            currentUserID={currentUser?.userID}
            formatTime={formatTime}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={sendMessage} />

      {/* Pickup Schedule Form Modal */}
      {showScheduleForm && post && (
        <PickupScheduleForm
          post={post}
          onSubmit={handleSchedulePickup}
          onCancel={() => setShowScheduleForm(false)}
          giverPreferences={otherUser?.preferences}
        />
      )}
    </div>
  );
};

export default ChatWindow;