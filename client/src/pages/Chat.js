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

  // ✅ MOVE ALL HOOKS BEFORE ANY EARLY RETURNS
  
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

  // ✅ NOW SAFE TO HAVE EARLY RETURNS AFTER ALL HOOKS
  
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
      lastName: conversation.otherUserName?.split(' ')[1] || 'User',
      profilePictureUrl: conversation.otherUserProfilePicture || null,
      isCollector: false, // You might want to fetch from User model
      isAdmin: false, // You might want to fetch from User model
      isOrganization: false // You might want to fetch from User model
    };

    handleOpenChat(conversation.postID, otherUser);
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setSelectedConversation(null);
  };

  const handleCloseChat = () => {
    setSelectedConversation(null);
    if (isMobile) {
      setShowConversationList(true);
    }
  };

  return (
    <div className={styles.chatPage}>
      <div className={styles.chatContainer}>
        {/* Left Panel - Conversation List */}
        <div className={`${styles.conversationPanel} ${
          !showConversationList && isMobile ? styles.hidden : ''
        }`}>
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

        {/* Right Panel - Chat Window */}
        <div className={`${styles.chatPanel} ${
          showConversationList && isMobile ? styles.hidden : ''
        }`}>
          {selectedConversation ? (
            <ChatWindow
              postID={selectedConversation.postID}
              otherUser={selectedConversation.otherUser}
              currentUser={user}
              onClose={handleCloseChat}
              onBack={isMobile ? handleBackToList : null}
              postData={selectedConversation.postData}
            />
          ) : (
            <div className={styles.noChatSelected}>
              <div className={styles.emptyState}>
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;