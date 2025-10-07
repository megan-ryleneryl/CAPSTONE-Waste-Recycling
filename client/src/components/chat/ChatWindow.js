// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Calendar, Package, Edit3 } from 'lucide-react';
import PickupScheduleForm from './PickupScheduleForm';
import PickupCard from './PickupCard';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import styles from './ChatWindow.module.css';


const ChatWindow = ({ postID, otherUser, currentUser, onClose, onBack, postData }) => {
  const [messages, setMessages] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [activePickup, setActivePickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(postData);
  const [otherUserData, setOtherUserData] = useState(otherUser);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

useEffect(() => {
    // Reset state when switching conversations
    setMessages([]);
    setPost(postData);
    setOtherUserData(otherUser);
    setActivePickup(null);
    setLoading(true);
    
    loadChatData();
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [postID, otherUser?.userID, currentUser?.userID]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const navigate = useNavigate();

const loadChatData = async () => {
  if (!postID || !otherUser?.userID || !currentUser?.userID) {
    console.log('Missing required data:', { postID, otherUserID: otherUser?.userID, currentUserID: currentUser?.userID });
    setLoading(false);
    return;
  }

  try {
    // 1. Fetch other user data properly
    let userDataToSet = otherUser;
    
    if (!otherUser.firstName || !otherUser.lastName) {
      console.log('Fetching complete user data for:', otherUser.userID);
      const userDocRef = doc(db, 'users', otherUser.userID);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userDataToSet = { 
          userID: userDoc.id, 
          ...userData,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User'
        };
        console.log('Loaded user data:', userDataToSet);
      } else {
        console.warn('User document not found for:', otherUser.userID);
        userDataToSet = {
          ...otherUser,
          name: otherUser.userName || 'Unknown User',
          firstName: otherUser.userName || 'Unknown',
          lastName: 'User'
        };
      }
    } else {
      userDataToSet = {
        ...otherUser,
        name: `${otherUser.firstName} ${otherUser.lastName}`.trim()
      };
    }
    
    setOtherUserData(userDataToSet);
    
    // 2. Fetch post data - ALWAYS fetch fresh to ensure correct post is shown
    console.log('Fetching post data for:', postID);
    const postDocRef = doc(db, 'posts', postID);
    const postDoc = await getDoc(postDocRef);
    if (postDoc.exists()) {
      const postData = { postID: postDoc.id, ...postDoc.data() };
      setPost(postData);
      console.log('Loaded post data:', postData);
    } else {
      console.error('Post not found');
      setPost({ postID, title: 'Post Not Found', postType: 'Unknown' });
    }

    // 3. Subscribe to messages
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('postID', '==', postID),
      where('isDeleted', '==', false),
      orderBy('sentAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        // Filter messages between current user and other user
        if (
          (messageData.senderID === currentUser.userID && messageData.receiverID === otherUser.userID) ||
          (messageData.senderID === otherUser.userID && messageData.receiverID === currentUser.userID) ||
          messageData.messageType === 'system'
        ) {
          messagesData.push({
            id: doc.id,
            ...messageData
          });
        }
      });
      setMessages(messagesData);
      setLoading(false);
    });

    // 4. Subscribe to pickup updates for this specific conversation
    const pickupsRef = collection(db, 'pickups');
    const pickupQuery = query(
      pickupsRef,
      where('postID', '==', postID)
    );

    const unsubscribePickup = onSnapshot(pickupQuery, (snapshot) => {
      if (!snapshot.empty) {
        // Find the pickup that matches this specific conversation
        const relevantPickup = snapshot.docs.find(doc => {
          const data = doc.data();
          const isRelevant = 
            (data.giverID === otherUser.userID && data.collectorID === currentUser.userID) ||
            (data.collectorID === otherUser.userID && data.giverID === currentUser.userID);
          
          const isActive = ['Proposed', 'Confirmed', 'In-Progress'].includes(data.status);
          
          return isRelevant && isActive;
        });
        
        if (relevantPickup) {
          const pickupData = { id: relevantPickup.id, ...relevantPickup.data() };
          console.log('Active pickup found:', pickupData);
          setActivePickup(pickupData);
        } else {
          console.log('No active pickup for this conversation');
          setActivePickup(null);
        }
      } else {
        console.log('No pickups found for this post');
        setActivePickup(null);
      }
    });

    // Store combined unsubscribe function
    unsubscribeRef.current = () => {
      unsubscribeMessages();
      unsubscribePickup();
    };
    
  } catch (error) {
    console.error('Error loading chat data:', error);
    setLoading(false);
  }
};
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

const sendMessage = async (messageText, messageType = 'text', metadata = {}) => {
  try {
    const newMessage = {
      messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderID: currentUser.userID,
      senderName: `${currentUser.firstName} ${currentUser.lastName}`,
      receiverID: otherUser.userID,
      receiverName: otherUserData?.name || `${otherUserData?.firstName || ''} ${otherUserData?.lastName || ''}`.trim() || 'Unknown User',
      postID: postID,
      postTitle: post?.title || postData?.title || 'Post',
      postType: post?.postType || postData?.postType || 'Waste',
      message: messageText,
      messageType: messageType,
      metadata: metadata,
      isRead: false,
      isDeleted: false,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'messages'), newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

  const handleSchedulePickup = async (formData) => {
    try {
      const pickupData = {
        postID,
        postType: post?.postType || 'Waste',
        postTitle: post?.title || 'Waste Post',
        giverID: post?.userID || otherUser.userID,
        giverName: otherUserData.name,
        collectorID: currentUser.userID,
        collectorName: `${currentUser.firstName} ${currentUser.lastName}`,
        proposedBy: currentUser.userID,
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        pickupLocation: formData.pickupLocation,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        alternateContact: formData.alternateContact || '',
        specialInstructions: formData.specialInstructions || '',
        status: 'Proposed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const pickupRef = await addDoc(collection(db, 'pickups'), pickupData);
      
      // Send system message
      await sendMessage(`[Pickup] Scheduled for ${formData.pickupDate} at ${formData.pickupTime}`);
      
      // Update active pickup
      setActivePickup({ id: pickupRef.id, ...pickupData });
      setShowScheduleForm(false);
      
      alert('Pickup scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      alert('Failed to schedule pickup. Please try again.');
    }
  };

  const updatePickupStatus = async (status) => {
    if (!activePickup?.id) return;
    
    try {
      const pickupRef = doc(db, 'pickups', activePickup.id);
      await updateDoc(pickupRef, {
        status,
        updatedAt: serverTimestamp(),
        [`${status.toLowerCase()}At`]: serverTimestamp()
      });
      
      setActivePickup(prev => ({ ...prev, status }));
      await sendMessage(`[Update] Pickup status updated to: ${status}`);
    } catch (error) {
      console.error('Error updating pickup status:', error);
      alert('Failed to update pickup status.');
    }
  };

  const editPickup = async (pickupId, updatedData) => {
  if (!pickupId) return;
  
  try {
    const pickupRef = doc(db, 'pickups', pickupId);
    await updateDoc(pickupRef, {
      ...updatedData,
      status: 'Proposed', // Reset to proposed when edited
      updatedAt: serverTimestamp()
    });
    
    // Update local state
    setActivePickup(prev => ({ 
      ...prev, 
      ...updatedData,
      status: 'Proposed'
    }));
    
    // Send system message about the edit
    await sendMessage(`[Edit] Pickup schedule has been edited and set back to Proposed status`);
    
    alert('Pickup schedule updated successfully. The giver needs to confirm the new details.');
  } catch (error) {
    console.error('Error editing pickup:', error);
    throw error;
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

  const isCollector = currentUser?.userType === 'Collector' || currentUser?.isCollector;
  const canSchedulePickup = isCollector && !activePickup && post;

return (
  <div className={styles.chatWindow}>
    <div className={styles.header}>
      <div className={styles.headerInfo}>
        {onBack && (
          <button onClick={onBack} className={styles.backButton}>
            ← Back
          </button>
        )}
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {otherUserData?.profilePicture ? (
              <img 
                src={otherUserData.profilePicture} 
                alt={otherUserData?.name || 'User'} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.textContent = (otherUserData?.name || otherUserData?.firstName || 'U').charAt(0).toUpperCase();
                }}
              />
            ) : (
              (otherUserData?.name || otherUserData?.firstName || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className={styles.userDetails}>
            <h3 className={styles.userName}>
              {otherUserData?.name || `${otherUserData?.firstName || ''} ${otherUserData?.lastName || ''}`.trim() || 'Unknown User'}
            </h3>
            <p className={styles.postTitle}>{post?.title || 'Loading...'}</p>
          </div>
        </div>
      </div>
      
      <div className={styles.headerActions}>
        {canSchedulePickup && !activePickup && (
          <button
            onClick={() => setShowScheduleForm(true)}
            className={styles.scheduleButton}
          >
            <Calendar className={styles.buttonIcon} size={20} />
            <span className={styles.buttonText}>Schedule Pickup</span>
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className={styles.closeButton} aria-label="Close chat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>
    </div>

    {activePickup && (
      <PickupCard 
        pickup={activePickup} 
        currentUser={currentUser}
        onUpdateStatus={updatePickupStatus}
        onEditPickup={editPickup}
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
        disabled={!otherUserData}
      />

      {showScheduleForm && (
        <PickupScheduleForm
          post={post}
          giverPreferences={otherUserData?.preferences}
          onSubmit={handleSchedulePickup}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;