// client/src/components/chat/ChatIntegration.js - Example implementation
import React, { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import styles from './ChatIntegration.module.css';

const ChatIntegration = ({ currentUser, initialPostID = null, initialOtherUser = null }) => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatWindowOpen, setChatWindowOpen] = useState(false);
  const [postData, setPostData] = useState(null);
  
  // If initial values are provided, open chat directly
  useEffect(() => {
    if (initialPostID && initialOtherUser) {
      openDirectChat(initialPostID, initialOtherUser);
    }
  }, [initialPostID, initialOtherUser]);

  const openDirectChat = (postID, otherUser, postData = null) => {
    setSelectedConversation({
      postID,
      otherUserID: otherUser.userID,
      otherUser
    });
    setPostData(postData);
    setChatWindowOpen(true);
  };

  const handleConversationSelect = async (conversation) => {
    // You might want to fetch additional user data here
    const otherUser = {
      userID: conversation.otherUserID,
      firstName: conversation.otherUserName.split(' ')[0] || 'Unknown',
      lastName: conversation.otherUserName.split(' ')[1] || 'User',
      isCollector: false,  // You'll need to fetch from User model
      isAdmin: false, // You'll need to fetch from User model
      isOrganization: false // You'll need to fetch from User model
    };

    setSelectedConversation({
      postID: conversation.postID,
      otherUserID: conversation.otherUserID,
      otherUser
    });
    setChatWindowOpen(true);
  };

  const handleCloseChatWindow = () => {
    setChatWindowOpen(false);
    setSelectedConversation(null);
    setPostData(null);
  };

  return (
    <div className={styles.chatIntegration}>
      <div className={styles.conversationPanel}>
        <ConversationList
          currentUser={currentUser}
          onSelectConversation={handleConversationSelect}
          selectedConversationId={
            selectedConversation 
              ? `${selectedConversation.postID}-${selectedConversation.otherUserID}`
              : null
          }
        />
      </div>

      {chatWindowOpen && selectedConversation && (
        <div className={styles.chatPanel}>
          <ChatWindow
            postID={selectedConversation.postID}
            otherUser={selectedConversation.otherUser}
            currentUser={currentUser}
            onClose={handleCloseChatWindow}
            postData={postData}
          />
        </div>
      )}
    </div>
  );
};

export default ChatIntegration;