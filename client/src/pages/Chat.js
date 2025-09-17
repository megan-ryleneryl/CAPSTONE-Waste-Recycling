// client/src/pages/Chat.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import styles from './Chat.module.css';

const Chat = () => {
  const { currentUser: user, loading } = useAuth();
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showConversationList, setShowConversationList] = useState(true);

  // Add loading state while user loads
  if (loading || !user) {
    return (
      <div className={styles.chatPage}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  // Handle initial conversation from navigation state
  useEffect(() => {
    if (location.state?.postID && location.state?.otherUser) {
      handleOpenChat(location.state.postID, location.state.otherUser, location.state.postData);
    }
  }, [location.state]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowConversationList(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenChat = (postID, otherUser, postData = null) => {
    setSelectedConversation({
      postID,
      otherUser,
      postData
    });
    
    // On mobile, hide conversation list when chat opens
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleConversationSelect = (conversation) => {
    // Create otherUser object from conversation data
    const otherUser = {
      userID: conversation.otherUserID,
      firstName: conversation.otherUserName?.split(' ')[0] || 'Unknown',
      lastName: conversation.otherUserName?.split(' ')[1] || '',
      userType: conversation.otherUserType || 'User'
    };

    handleOpenChat(conversation.postID, otherUser, conversation.postData);
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    if (isMobile) {
      setShowConversationList(true);
    }
  };

  return (
    <div className={styles.chatPage}>
      <div className={styles.chatHeader}>
        <h1>Messages</h1>
        <p className={styles.subtitle}>
          Coordinate pickups and communicate with other users
        </p>
      </div>

      <div className={styles.chatContainer}>
        {/* Conversation List Panel */}
        {(!isMobile || showConversationList) && (
          <div className={styles.conversationPanel}>
            <ConversationList
              currentUser={user}
              onSelectConversation={handleConversationSelect}
              selectedConversationId={
                selectedConversation 
                  ? `${selectedConversation.postID}-${selectedConversation.otherUser.userID}`
                  : null
              }
            />
          </div>
        )}

        {/* Chat Window Panel */}
        {(!isMobile || !showConversationList) && selectedConversation && (
          <div className={styles.chatPanel}>
            <ChatWindow
              postID={selectedConversation.postID}
              otherUser={selectedConversation.otherUser}
              currentUser={user}
              onClose={handleCloseChat}
              postData={selectedConversation.postData}
            />
          </div>
        )}

        {/* Empty state for desktop when no chat selected */}
        {!isMobile && !selectedConversation && (
          <div className={styles.emptyChatPanel}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;