// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
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

const loadChatData = async () => {
  if (!postID || !otherUser?.userID || !currentUser?.userID) {
    console.log('Missing required data:', { postID, otherUserID: otherUser?.userID, currentUserID: currentUser?.userID });
    setLoading(false);
    return;
  }

  try {
    // Fetch post data if not provided
    if (!post) {
      const postDocRef = doc(db, 'posts', postID);
      const postDoc = await getDoc(postDocRef);
      if (postDoc.exists()) {
        setPost({ postID: postDoc.id, ...postDoc.data() });
      } else {
        console.error('Post not found');
        setPost({ postID, title: 'Post Not Found', postType: 'Unknown' });
      }
    }

    // Fetch other user data if not complete
    if (!otherUserData || !otherUserData.firstName) {
      const userDocRef = doc(db, 'users', otherUser.userID);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setOtherUserData({ userID: userDoc.id, ...userDoc.data() });
      }
    }

    // Subscribe to messages
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('postID', '==', postID),
      where('isDeleted', '==', false),
      orderBy('sentAt', 'asc')
    );

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
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

    // Check for active pickup
    const pickupsRef = collection(db, 'pickups');
    const pickupQuery = query(
      pickupsRef,
      where('postID', '==', postID),
      where('status', 'in', ['Proposed', 'Confirmed', 'In-Progress'])
    );
    
    const pickupSnapshot = await getDocs(pickupQuery);
    if (!pickupSnapshot.empty) {
      const pickupDoc = pickupSnapshot.docs[0];
      setActivePickup({ pickupID: pickupDoc.id, ...pickupDoc.data() });
    }
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
      receiverName: otherUserData ? `${otherUserData.firstName} ${otherUserData.lastName}` : otherUser.userName,
      postID: postID,
      postTitle: post?.title || postData?.title || 'Post', // Always include title
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
      await sendMessage(`📅 Pickup scheduled for ${formData.pickupDate} at ${formData.pickupTime}`);
      
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
      await sendMessage(`📦 Pickup status updated to: ${status}`);
    } catch (error) {
      console.error('Error updating pickup status:', error);
      alert('Failed to update pickup status.');
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
        <div className={styles.headerLeft}>
          {onBack && (
            <button onClick={onBack} className={styles.backButton}>
              ← Back
            </button>
          )}
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {otherUserData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className={styles.userName}>{otherUserData?.name || 'Unknown User'}</h3>
              <p className={styles.postTitle}>{post?.title || 'Loading...'}</p>
            </div>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          {canSchedulePickup && (
            <button
              onClick={() => setShowScheduleForm(true)}
              className={styles.scheduleButton}
            >
              📅 Schedule Pickup
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          )}
        </div>
      </div>

      {activePickup && (
        <PickupCard 
          pickup={activePickup} 
          currentUser={currentUser}
          onUpdateStatus={updatePickupStatus}
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