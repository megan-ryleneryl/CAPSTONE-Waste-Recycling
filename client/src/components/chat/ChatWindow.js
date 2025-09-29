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
      setLoading(true);
      
      // Load post data if not provided
      if (!postData && postID) {
        const postDoc = await getDoc(doc(db, 'posts', postID));
        if (postDoc.exists()) {
          setPost({ id: postDoc.id, ...postDoc.data() });
        }
      }

      // Load other user data if needed
      if (otherUser?.userID) {
        const userDoc = await getDoc(doc(db, 'users', otherUser.userID));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setOtherUserData({
            userID: otherUser.userID,
            firstName: userData.firstName || 'Unknown',
            lastName: userData.lastName || 'User',
            name: `${userData.firstName || 'Unknown'} ${userData.lastName || 'User'}`,
            userType: userData.userType || 'User',
            email: userData.email
          });
        }
      }

      // Set up real-time message listener
      const messagesQuery = query(
        collection(db, 'messages'),
        where('postID', '==', postID),
        orderBy('sentAt', 'asc')
      );

      unsubscribeRef.current = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            sentAt: doc.data().sentAt?.toDate() || new Date()
          }))
          .filter(msg => {
            // Only show messages between current user and other user
            return (msg.senderID === currentUser.userID && msg.receiverID === otherUser.userID) ||
                   (msg.senderID === otherUser.userID && msg.receiverID === currentUser.userID);
          });
        
        setMessages(messagesData);
        setLoading(false);
      });

      // Check for existing pickup
      const pickupsQuery = query(
        collection(db, 'pickups'),
        where('postID', '==', postID)
      );
      
      const pickupsSnapshot = await getDocs(pickupsQuery);
      if (!pickupsSnapshot.empty) {
        const pickupData = pickupsSnapshot.docs[0].data();
        setActivePickup({ id: pickupsSnapshot.docs[0].id, ...pickupData });
      }

    } catch (error) {
      console.error('Error loading chat data:', error);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || !postID || !otherUser?.userID) return;

    try {
      const newMessage = {
        senderID: currentUser.userID,
        senderName: `${currentUser.firstName} ${currentUser.lastName}`,
        senderType: currentUser.userType || 'User',
        receiverID: otherUser.userID,
        postID,
        message: messageText,
        messageType: 'text',
        isRead: false,
        sentAt: serverTimestamp(),
        readAt: null
      };

      await addDoc(collection(db, 'messages'), newMessage);
      // Message will appear via real-time listener
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
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