// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Calendar, Package, Edit3 } from 'lucide-react';
import PickupScheduleForm from './PickupScheduleForm';
import PickupCard from './PickupCard';
import SupportCard from './SupportCard';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import geocodingService from '../../services/geocodingService';
import styles from './ChatWindow.module.css';


const ChatWindow = ({ postID, otherUser, currentUser, onClose, onBack, postData }) => {
  const [messages, setMessages] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [activePickup, setActivePickup] = useState(null);
  const [activeSupport, setActiveSupport] = useState(null);
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
    setActiveSupport(null);
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
      const userDocRef = doc(db, 'users', otherUser.userID);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userDataToSet = { 
          userID: userDoc.id, 
          ...userData,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User'
        };
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
    const postDocRef = doc(db, 'posts', postID);
    const postDoc = await getDoc(postDocRef);
    let fetchedPostData;
    if (postDoc.exists()) {
      fetchedPostData = { postID: postDoc.id, ...postDoc.data() };
      setPost(fetchedPostData);
    } else {
      console.error('Post not found');
      fetchedPostData = { postID, title: 'Post Not Found', postType: 'Unknown' };
      setPost(fetchedPostData);
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
          
          const isActive = ['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup'].includes(data.status);
          
          return isRelevant && isActive;
        });
        
        if (relevantPickup) {
          const pickupData = { id: relevantPickup.id, ...relevantPickup.data() };
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

    // 5. Subscribe to support updates for Initiative posts
    let unsubscribeSupport = () => {};
    if (fetchedPostData?.postType === 'Initiative') {
      console.log('🟢 Setting up support subscription for Initiative post:', postID);
      const supportsRef = collection(db, 'supports');
      const supportQuery = query(
        supportsRef,
        where('initiativeID', '==', postID)
      );

      unsubscribeSupport = onSnapshot(supportQuery, (snapshot) => {
        console.log('🟢 Support snapshot received. Empty?', snapshot.empty, 'Docs count:', snapshot.docs.length);

        if (!snapshot.empty) {
          // Log all supports for debugging
          snapshot.docs.forEach(doc => {
            console.log('🟢 Support document:', doc.id, doc.data());
          });

          // Find the support that matches this specific conversation
          const relevantSupport = snapshot.docs.find(doc => {
            const data = doc.data();
            console.log('🟢 Checking support relevance:', {
              supportID: doc.id,
              giverID: data.giverID,
              collectorID: data.collectorID,
              currentUserID: currentUser.userID,
              otherUserID: otherUser.userID,
              status: data.status
            });

            const isRelevant =
              (data.giverID === otherUser.userID && data.collectorID === currentUser.userID) ||
              (data.collectorID === otherUser.userID && data.giverID === currentUser.userID);

            const isActive = ['Pending', 'Accepted', 'PickupScheduled'].includes(data.status);

            console.log('🟢 Support relevance check:', { isRelevant, isActive });

            return isRelevant && isActive;
          });

          if (relevantSupport) {
            const supportData = { id: relevantSupport.id, ...relevantSupport.data() };
            console.log('✅ Active support found:', supportData);
            setActiveSupport(supportData);
          } else {
            console.log('⚠️ No active support for this conversation');
            setActiveSupport(null);
          }
        } else {
          console.log('⚠️ No supports found for this initiative');
          setActiveSupport(null);
        }
      });
    } else {
      console.log('ℹ️ Post is not an Initiative, skipping support subscription');
    }

    // Store combined unsubscribe function
    unsubscribeRef.current = () => {
      unsubscribeMessages();
      unsubscribePickup();
      unsubscribeSupport();
    };

  } catch (error) {
    console.error('Error loading chat data:', error);
    setLoading(false);
  }
};
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
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
      sentAt: serverTimestamp()
    };

    await addDoc(collection(db, 'messages'), newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

  const handleSchedulePickup = async (formData) => {
    try {
      // Geocode the pickup location before saving
      let locationWithCoords = formData.pickupLocation;

      if (formData.pickupLocation && !formData.pickupLocation.coordinates?.lat) {
        console.log('🗺️ Geocoding pickup location...');
        try {
          const coords = await geocodingService.getCoordinates(formData.pickupLocation);

          if (coords) {
            locationWithCoords = {
              ...formData.pickupLocation,
              coordinates: {
                lat: coords.lat,
                lng: coords.lng
              }
            };
            console.log('✅ Pickup location coordinates added:', coords);
          } else {
            console.log('⚠️ Geocoding failed, proceeding without coordinates');
          }
        } catch (error) {
          console.error('Error geocoding location:', error);
          console.log('⚠️ Geocoding error, proceeding without coordinates');
        }
      }

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
        pickupLocation: locationWithCoords,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        alternateContact: formData.alternateContact || '',
        specialInstructions: formData.specialInstructions || '',
        status: 'Proposed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const pickupRef = await addDoc(collection(db, 'pickups'), pickupData);

      // If this is for an Initiative post with an active support, link the pickup to the support
      if (post?.postType === 'Initiative' && activeSupport) {
        try {
          const supportRef = doc(db, 'supports', activeSupport.supportID);
          await updateDoc(supportRef, {
            pickupID: pickupRef.id,
            pickupScheduled: true,
            status: 'PickupScheduled',
            updatedAt: new Date()
          });

          console.log('✅ Support linked to pickup:', { supportID: activeSupport.supportID, pickupID: pickupRef.id });

          // Update local support state
          setActiveSupport(prev => ({
            ...prev,
            pickupID: pickupRef.id,
            pickupScheduled: true,
            status: 'PickupScheduled'
          }));
        } catch (linkError) {
          console.error('Error linking support to pickup:', linkError);
          // Continue anyway - pickup is still created
        }
      }

      // Send system message with actor and guidance
      const collectorName = `${currentUser.firstName} ${currentUser.lastName}`;
      const giverName = otherUser.name || `${otherUserData?.firstName || ''} ${otherUserData?.lastName || ''}`.trim();
      await sendMessage(
        `[Pickup] ${collectorName} [Collector] proposed a pickup schedule for ${formData.pickupDate} at ${formData.pickupTime}. Waiting for ${giverName} [Giver] to confirm the pickup schedule.`,
        'system'
      );

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

      // Map status to the correct timestamp field name
      const timestampFieldMap = {
        'Proposed': 'proposedAt',
        'Confirmed': 'confirmedAt',
        'In-Transit': 'inTransitAt',
        'ArrivedAtPickup': 'arrivedAt',
        'Completed': 'completedAt',
        'Cancelled': 'cancelledAt'
      };

      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };

      // Add timestamp field if applicable
      if (timestampFieldMap[status]) {
        updateData[timestampFieldMap[status]] = serverTimestamp();
      }

      await updateDoc(pickupRef, updateData);

      setActivePickup(prev => ({ ...prev, status }));

      // Generate user-friendly status message with actor and guidance
      const actorName = `${currentUser.firstName} ${currentUser.lastName}`;
      const otherUserName = otherUserData?.name || `${otherUserData?.firstName || ''} ${otherUserData?.lastName || ''}`.trim();
      const isCollector = currentUser.userID === activePickup.collectorID;
      const actorRole = isCollector ? 'Collector' : 'Giver';
      const otherRole = isCollector ? 'Giver' : 'Collector';

      let statusMessage = '';

      if (status === 'Confirmed') {
        statusMessage = `[Status] ${actorName} [${actorRole}] confirmed the pickup schedule. ${otherUserName} [${otherRole}] can now proceed with the pickup.`;
      } else if (status === 'In-Transit') {
        statusMessage = `[Status] ${actorName} [${actorRole}] is on the way to the pickup location. ${otherUserName} [${otherRole}], please be ready for the pickup.`;
      } else if (status === 'ArrivedAtPickup') {
        statusMessage = `[Status] ${actorName} [${actorRole}] has arrived at the pickup location. Waiting for ${otherUserName} [${otherRole}] to complete the pickup.`;
      } else if (status === 'Cancelled') {
        statusMessage = `[Status] ${actorName} [${actorRole}] cancelled the pickup. This pickup has been terminated.`;
      } else {
        statusMessage = `[Status] Pickup status updated to: ${status}`;
      }

      await sendMessage(statusMessage, 'system');
    } catch (error) {
      console.error('Error updating pickup status:', error);
      alert('Failed to update pickup status.');
    }
  };

  const editPickup = async (pickupId, updatedData) => {
  if (!pickupId) return;

  try {
    // Geocode the pickup location if it's being updated
    let dataToUpdate = { ...updatedData };

    if (updatedData.pickupLocation && !updatedData.pickupLocation.coordinates?.lat) {
      console.log('🗺️ Geocoding updated pickup location...');
      try {
        const coords = await geocodingService.getCoordinates(updatedData.pickupLocation);

        if (coords) {
          dataToUpdate.pickupLocation = {
            ...updatedData.pickupLocation,
            coordinates: {
              lat: coords.lat,
              lng: coords.lng
            }
          };
          console.log('✅ Updated pickup location coordinates added:', coords);
        } else {
          console.log('⚠️ Geocoding failed for updated location, proceeding without coordinates');
        }
      } catch (error) {
        console.error('Error geocoding updated location:', error);
        console.log('⚠️ Geocoding error, proceeding without coordinates');
      }
    }

    const pickupRef = doc(db, 'pickups', pickupId);
    await updateDoc(pickupRef, {
      ...dataToUpdate,
      status: 'Proposed', // Reset to proposed when edited
      updatedAt: serverTimestamp()
    });
    
    // Update local state
    setActivePickup(prev => ({ 
      ...prev, 
      ...updatedData,
      status: 'Proposed'
    }));
    
    // Send system message about the edit with actor and guidance
    const collectorName = `${currentUser.firstName} ${currentUser.lastName}`;
    const giverName = otherUserData?.name || `${otherUserData?.firstName || ''} ${otherUserData?.lastName || ''}`.trim();
    await sendMessage(
      `[Edit] ${collectorName} [Collector] edited the pickup schedule. Status has been reset to Proposed. Waiting for ${giverName} [Giver] to confirm the new schedule.`,
      'system'
    );
    
    alert('Pickup schedule updated successfully. The giver needs to confirm the new details.');
  } catch (error) {
    console.error('Error editing pickup:', error);
    throw error;
  }
};

  // Handle accepting support request (or specific material)
  const handleAcceptSupport = async (supportID, materialID = null) => {
    try {
      const token = localStorage.getItem('token');
      const url = materialID
        ? `${process.env.REACT_APP_API_URL}/posts/support/${supportID}/accept-material`
        : `${process.env.REACT_APP_API_URL}/posts/support/${supportID}/accept`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: materialID ? JSON.stringify({ materialID }) : undefined
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept support');
      }

      // Refresh support data from server
      if (activeSupport && activeSupport.supportID === supportID) {
        // The support status might have changed to PartiallyAccepted or Accepted
        // Fetch updated support data would be ideal, but for now update locally
        if (materialID && activeSupport.offeredMaterials) {
          const updatedMaterials = activeSupport.offeredMaterials.map(m =>
            m.materialID === materialID ? { ...m, status: 'Accepted' } : m
          );
          const acceptedCount = updatedMaterials.filter(m => m.status === 'Accepted').length;
          const newStatus = acceptedCount === updatedMaterials.length ? 'Accepted' : 'PartiallyAccepted';

          setActiveSupport(prev => ({
            ...prev,
            offeredMaterials: updatedMaterials,
            status: newStatus
          }));
        } else {
          setActiveSupport(prev => ({ ...prev, status: 'Accepted' }));
        }
      }

      alert(materialID ? 'Material accepted!' : 'Support request accepted!');
    } catch (error) {
      console.error('Error accepting support:', error);
      throw error;
    }
  };

  // Handle declining support request (or specific material)
  const handleDeclineSupport = async (supportID, materialID = null, reason) => {
    try {
      const token = localStorage.getItem('token');
      const url = materialID
        ? `${process.env.REACT_APP_API_URL}/posts/support/${supportID}/decline-material`
        : `${process.env.REACT_APP_API_URL}/posts/support/${supportID}/decline`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ materialID, reason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to decline support');
      }

      // Update local state
      if (activeSupport && activeSupport.supportID === supportID) {
        if (materialID && activeSupport.offeredMaterials) {
          const updatedMaterials = activeSupport.offeredMaterials.map(m =>
            m.materialID === materialID ? { ...m, status: 'Declined', rejectionReason: reason } : m
          );
          const declinedCount = updatedMaterials.filter(m => m.status === 'Declined').length;
          const acceptedCount = updatedMaterials.filter(m => m.status === 'Accepted').length;
          let newStatus = 'Pending';
          if (declinedCount === updatedMaterials.length) {
            newStatus = 'Declined';
          } else if (acceptedCount > 0) {
            newStatus = 'PartiallyAccepted';
          }

          setActiveSupport(prev => ({
            ...prev,
            offeredMaterials: updatedMaterials,
            status: newStatus
          }));
        } else {
          setActiveSupport(prev => ({ ...prev, status: 'Declined', rejectionReason: reason }));
        }
      }

      alert(materialID ? 'Material declined' : 'Support request declined');
    } catch (error) {
      console.error('Error declining support:', error);
      throw error;
    }
  };

  // Handle scheduling pickup for accepted support
  const handleSchedulePickupForSupport = (support) => {
    // Show the pickup schedule form
    setShowScheduleForm(true);
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
  // Only show schedule pickup button if:
  // 1. User is a collector
  // 2. No active pickup exists
  // 3. Post exists and is not a Forum post
  // 4. Current user is the one who claimed the post (claimedBy matches current user)
  // 5. Post is not already completed
  const canSchedulePickup = isCollector && !activePickup && post &&
    post.postType !== 'Forum' &&
    post.claimedBy === currentUser?.userID &&
    post.status !== 'Completed';

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

    {activeSupport && post?.postType === 'Initiative' && (
      <SupportCard
        support={activeSupport}
        currentUser={currentUser}
        onAccept={handleAcceptSupport}
        onDecline={handleDeclineSupport}
        onSchedulePickup={handleSchedulePickupForSupport}
      />
    )}

      <MessageList
        messages={messages}
        currentUser={currentUser}
        className={styles.messagesList}
        messagesEndRef={messagesEndRef}
      />

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