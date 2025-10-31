// client/src/components/chat/ChatWindow.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Package, Edit3, XCircle, ClipboardList } from 'lucide-react';
import PickupScheduleForm from './PickupScheduleForm';
import PickupCard from './PickupCard';
import SupportCard from './SupportCard';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ProposedPickupsModal from './ProposedPickupsModal';
import geocodingService from '../../services/geocodingService';
import styles from './ChatWindow.module.css';


const ChatWindow = ({ postID, otherUser, currentUser, onClose, onBack, postData }) => {
  const [messages, setMessages] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showProposedPickupsModal, setShowProposedPickupsModal] = useState(false);
  const [proposedPickups, setProposedPickups] = useState([]);
  const [activePickup, setActivePickup] = useState(null);
  const [activeSupport, setActiveSupport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(postData);
  const [otherUserData, setOtherUserData] = useState(otherUser);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Store latest prop values in refs to avoid dependency issues
  const otherUserRef = useRef(otherUser);
  const currentUserRef = useRef(currentUser);
  const postDataRef = useRef(postData);

  const navigate = useNavigate();

  useEffect(() => {
    otherUserRef.current = otherUser;
    currentUserRef.current = currentUser;
    postDataRef.current = postData;
  }, [otherUser, currentUser, postData]);

  // Define loadChatData BEFORE the useEffect that calls it
  const loadChatData = useCallback(async () => {
  const otherUser = otherUserRef.current;
  const currentUser = currentUserRef.current;
  const postData = postDataRef.current;

  if (!postID || !otherUser?.userID || !currentUser?.userID) {
    console.log('Missing required data:', { postID, otherUserID: otherUser?.userID, currentUserID: currentUser?.userID });
    setLoading(false);
    return;
  }

  try {
    // 1. Fetch other user data properly (one-time fetch, not subscription)
    let userDataToSet = otherUser;

    if (!otherUser.firstName || !otherUser.lastName || !otherUser.profilePictureUrl) {
      const userDocRef = doc(db, 'users', otherUser.userID);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        userDataToSet = {
          userID: userDoc.id,
          ...userData,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User',
          profilePictureUrl: userData.profilePictureUrl || otherUser.profilePictureUrl || null
        };
      } else {
        console.warn('User document not found for:', otherUser.userID);
        userDataToSet = {
          ...otherUser,
          name: otherUser.userName || 'Unknown User',
          firstName: otherUser.userName || 'Unknown',
          lastName: 'User',
          profilePictureUrl: otherUser.profilePictureUrl || null
        };
      }
    } else {
      userDataToSet = {
        ...otherUser,
        name: `${otherUser.firstName} ${otherUser.lastName}`.trim(),
        profilePictureUrl: otherUser.profilePictureUrl || null
      };
    }

    setOtherUserData(userDataToSet);

    // 2. Fetch post data - one-time fetch only
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

    // 3. OPTIMIZED: Single onSnapshot for messages only - most active data
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
          // Only show system messages intended for the current user
          (messageData.messageType === 'system' && messageData.receiverID === currentUser.userID)
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

    // 4. OPTIMIZED: Load pickup data once, then refetch on user action (not real-time)
    const loadPickupData = async () => {
      const pickupsRef = collection(db, 'pickups');
      const pickupQuery = query(
        pickupsRef,
        where('postID', '==', postID)
      );

      const snapshot = await getDocs(pickupQuery);
      if (!snapshot.empty) {
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
          setActivePickup(null);
        }
      } else {
        setActivePickup(null);
      }
    };

    await loadPickupData();

    // 5. OPTIMIZED: Load support data once for Initiative posts (not real-time)
    if (fetchedPostData?.postType === 'Initiative') {
      const supportsRef = collection(db, 'supports');
      const supportQuery = query(
        supportsRef,
        where('initiativeID', '==', postID)
      );

      const snapshot = await getDocs(supportQuery);
      if (!snapshot.empty) {
        const relevantSupport = snapshot.docs.find(doc => {
          const data = doc.data();
          const isRelevant =
            (data.giverID === otherUser.userID && data.collectorID === currentUser.userID) ||
            (data.collectorID === otherUser.userID && data.giverID === currentUser.userID);

          const isActive = ['Pending', 'PartiallyAccepted', 'Accepted', 'PickupScheduled'].includes(data.status);

          return isRelevant && isActive;
        });

        if (relevantSupport) {
          const supportData = { id: relevantSupport.id, ...relevantSupport.data() };
          setActiveSupport(supportData);
        } else {
          setActiveSupport(null);
        }
      } else {
        setActiveSupport(null);
      }
    }

    // Store unsubscribe function - now only for messages
    unsubscribeRef.current = () => {
      unsubscribeMessages();
    };

  } catch (error) {
    console.error('Error loading chat data:', error);
    setLoading(false);
  }
}, [postID]); // Only depend on postID since we use refs for the others

  // useEffects that depend on loadChatData must come AFTER its definition
  useEffect(() => {
    // Reset state when switching conversations
    setMessages([]);
    setPost(postDataRef.current);
    setOtherUserData(otherUserRef.current);
    setActivePickup(null);
    setActiveSupport(null);
    setLoading(true);

    loadChatData();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [postID, otherUser?.userID, currentUser?.userID, loadChatData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      // For Initiative posts: current user (initiative owner) is collector, other user (supporter) is giver
      // For Waste posts: post owner is giver, current user (collector) is collector
      const isInitiativePost = post?.postType === 'Initiative';
      const giverID = isInitiativePost ? otherUser.userID : post?.userID;
      const giverName = isInitiativePost ? otherUserData.name : (post?.userName || otherUserData.name);

      const pickupData = {
        postID,
        postType: post?.postType || 'Waste',
        postTitle: post?.title || 'Waste Post',
        giverID: giverID,
        giverName: giverName,
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
        proposedPrice: formData.proposedPrice || [], // Array of { materialID, materialName, quantity, proposedPricePerKilo }
        totalPrice: formData.totalPrice || 0, // Calculated total price
        price: post?.price || 0,
        status: 'Proposed',
        // Link supportID if this is for an Initiative post with active support
        supportID: (post?.postType === 'Initiative' && activeSupport) ? activeSupport.supportID : null,
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
      const giverDisplayName = otherUser.name || `${otherUserData?.firstName || ''} ${otherUserData?.lastName || ''}`.trim();
      await sendMessage(
        `[Pickup] ${collectorName} [Collector] proposed a pickup schedule for ${formData.pickupDate} at ${formData.pickupTime}. Waiting for ${giverDisplayName} [Giver] to confirm the pickup schedule.`,
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

  const refreshPickupData = async () => {
    if (!postID) return;

    const pickupsRef = collection(db, 'pickups');
    const pickupQuery = query(
      pickupsRef,
      where('postID', '==', postID)
    );

    const snapshot = await getDocs(pickupQuery);
    if (!snapshot.empty) {
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
        setActivePickup(null);
      }
    } else {
      setActivePickup(null);
    }
  };

  // Load all proposed pickups for this post (for giver to view)
  const loadProposedPickups = async () => {
    if (!postID) return;

    try {
      const pickupsRef = collection(db, 'pickups');
      const pickupQuery = query(
        pickupsRef,
        where('postID', '==', postID),
        where('status', '==', 'Proposed')
      );

      const snapshot = await getDocs(pickupQuery);
      const pickupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setProposedPickups(pickupsData);
      return pickupsData;
    } catch (error) {
      console.error('Error loading proposed pickups:', error);
      return [];
    }
  };

  // Confirm a pickup (giver selects a collector)
  const handleConfirmPickup = async (pickupId) => {
    if (!pickupId || !postID) return;

    try {
      // 1. Update selected pickup to "Confirmed"
      const selectedPickupRef = doc(db, 'pickups', pickupId);
      await updateDoc(selectedPickupRef, {
        status: 'Confirmed',
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Get the confirmed pickup data
      const confirmedPickupSnap = await getDoc(selectedPickupRef);
      const confirmedPickup = confirmedPickupSnap.data();

      // 3. Update post status to "Claimed" and set claimedBy
      const postRef = doc(db, 'posts', postID);
      await updateDoc(postRef, {
        status: 'Claimed',
        claimedBy: confirmedPickup.collectorID,
        claimedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Get all OTHER proposed pickups for this post
      const allPickupsQuery = query(
        collection(db, 'pickups'),
        where('postID', '==', postID),
        where('status', '==', 'Proposed')
      );
      const otherPickupsSnap = await getDocs(allPickupsQuery);

      // 5. Cancel all other proposed pickups and notify collectors
      const cancelPromises = otherPickupsSnap.docs.map(async (pickupDoc) => {
        const pickupData = pickupDoc.data();

        // Cancel the pickup
        await updateDoc(doc(db, 'pickups', pickupDoc.id), {
          status: 'Cancelled',
          cancelledAt: serverTimestamp(),
          cancellationReason: 'Giver selected another collector',
          updatedAt: serverTimestamp()
        });

        // Send system message to rejected collector
        await addDoc(collection(db, 'messages'), {
          messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderID: 'system',
          senderName: 'System',
          receiverID: pickupData.collectorID,
          receiverName: pickupData.collectorName,
          postID: postID,
          postTitle: post?.title || 'Post',
          postType: post?.postType || 'Waste',
          messageType: 'system',
          message: `[Status] The giver has proceeded with another collector for "${post?.title || 'this post'}". Your pickup schedule has been cancelled.`,
          isRead: false,
          isDeleted: false,
          sentAt: serverTimestamp(),
          metadata: {
            action: 'pickup_rejected',
            pickupID: pickupDoc.id
          }
        });
      });

      await Promise.all(cancelPromises);

      // 6. Refresh UI
      await refreshPickupData();
      await loadProposedPickups();
      setShowProposedPickupsModal(false);

      // Reload post data
      const updatedPostSnap = await getDoc(postRef);
      if (updatedPostSnap.exists()) {
        setPost({ id: updatedPostSnap.id, ...updatedPostSnap.data() });
      }

      alert('Pickup confirmed! Other proposals have been cancelled.');
    } catch (error) {
      console.error('Error confirming pickup:', error);
      alert('Failed to confirm pickup. Please try again.');
    }
  };

  // Reject a single pickup (keeps collector's claim active)
  const handleRejectPickup = async (pickupId) => {
    if (!pickupId) return;

    try {
      const pickupRef = doc(db, 'pickups', pickupId);
      const pickupSnap = await getDoc(pickupRef);
      const pickupData = pickupSnap.data();

      // Cancel the pickup
      await updateDoc(pickupRef, {
        status: 'Cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: 'Rejected by giver',
        updatedAt: serverTimestamp()
      });

      // Send system message to collector
      await addDoc(collection(db, 'messages'), {
        messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderID: 'system',
        senderName: 'System',
        receiverID: pickupData.collectorID,
        receiverName: pickupData.collectorName,
        postID: postID,
        postTitle: post?.title || 'Post',
        postType: post?.postType || 'Waste',
        messageType: 'system',
        message: `[Status] The giver has rejected your pickup proposal for "${post?.title || 'this post'}". You can propose a new schedule if you'd like.`,
        isRead: false,
        isDeleted: false,
        sentAt: serverTimestamp(),
        metadata: {
          action: 'pickup_rejected',
          pickupID: pickupId
        }
      });

      // Refresh proposed pickups list
      await loadProposedPickups();

      alert('Pickup proposal rejected. The collector can still propose a new schedule.');
    } catch (error) {
      console.error('Error rejecting pickup:', error);
      alert('Failed to reject pickup. Please try again.');
    }
  };

  const updatePickupStatus = async (status, reason) => {
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

      // Add cancellation reason if provided
      if (status === 'Cancelled' && reason) {
        updateData.cancellationReason = reason;
      }

      // Add timestamp field if applicable
      if (timestampFieldMap[status]) {
        updateData[timestampFieldMap[status]] = serverTimestamp();
      }

      await updateDoc(pickupRef, updateData);

      // Refresh pickup data after update
      await refreshPickupData();

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
        if (reason) {
          statusMessage += ` Reason: ${reason}`;
        }
      } else {
        statusMessage = `[Status] Pickup status updated to: ${status}`;
      }

      await sendMessage(statusMessage, 'system');
    } catch (error) {
      console.error('Error updating pickup status:', error);
      alert('Failed to update pickup status.');
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

  // Handle cancelling a claim
  const handleCancelClaim = async () => {
    if (!post?.postID) return;

    const confirmCancel = window.confirm(
      'Are you sure you want to cancel your claim? This post will become available for other collectors to claim.'
    );

    if (!confirmCancel) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/posts/${post.postID}/cancel-claim`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel claim');
      }

      // Update local post state
      setPost(prev => ({
        ...prev,
        status: 'Active',
        claimedBy: null,
        claimedAt: null
      }));

      alert('Claim cancelled successfully. The post is now available for others.');

      // Optionally, close the chat or navigate away
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error cancelling claim:', error);
      alert(error.message || 'Failed to cancel claim. Please try again.');
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

  const isCollector = currentUser?.isCollector || currentUser?.isAdmin;
  // Only show schedule pickup button if:
  // 1. User is a collector
  // 2. No active pickup exists
  // 3. Post exists and is not a Forum post
  // 4. Current user is in the interestedCollectors array
  // 5. Post is Active (not Claimed or Completed) - collectors can only schedule if no one is selected yet
  const canSchedulePickup = isCollector && !activePickup && post &&
    post.postType !== 'Forum' &&
    post.interestedCollectors?.includes(currentUser?.userID) &&
    post.status === 'Active'; // Only allow scheduling when post is Active, not Claimed or Completed

  // Show cancel claim button if:
  // 1. User is a collector
  // 2. Post is a Waste post
  // 3. Post is currently claimed by the current user
  // 4. No active pickup scheduled yet (can't cancel if pickup is already scheduled)
  const canCancelClaim = isCollector && post &&
    post.postType === 'Waste' &&
    post.status === 'Claimed' &&
    post.claimedBy === currentUser?.userID &&
    !activePickup;

  // Show proposed pickups button if:
  // 1. User is the giver (post owner)
  // 2. Post is a Waste post
  // 3. Post is Active (not yet claimed) and has interested collectors
  const canViewProposedPickups = post &&
    post.postType === 'Waste' &&
    post.userID === currentUser?.userID &&
    post.status === 'Active' &&
    post.interestedCollectors?.length > 0;

  // Open proposed pickups modal
  const handleViewProposedPickups = async () => {
    await loadProposedPickups();
    setShowProposedPickupsModal(true);
  };

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
            {otherUserData?.profilePictureUrl ? (
              <img
                src={otherUserData.profilePictureUrl}
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
            {post?.postID ? (
              <Link
                to={`/posts/${post.postID}`}
                className={styles.postTitleLink}
                title="View post details"
              >
                {post?.title || 'Loading...'}
              </Link>
            ) : (
              <p className={styles.postTitle}>{post?.title || 'Loading...'}</p>
            )}
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
        {canCancelClaim && (
          <button
            onClick={handleCancelClaim}
            className={styles.cancelClaimButton}
            title="Cancel your claim on this post"
          >
            <XCircle className={styles.buttonIcon} size={20} />
            <span className={styles.buttonText}>Cancel Claim</span>
          </button>
        )}
        {canViewProposedPickups && (
          <button
            onClick={handleViewProposedPickups}
            className={styles.proposedPickupsButton}
            title="View all proposed pickup schedules"
          >
            <ClipboardList className={styles.buttonIcon} size={20} />
            <span className={styles.buttonText}>
              View Proposals {proposedPickups.length > 0 && `(${proposedPickups.length})`}
            </span>
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

      {showProposedPickupsModal && (
        <ProposedPickupsModal
          proposedPickups={proposedPickups}
          onConfirm={handleConfirmPickup}
          onReject={handleRejectPickup}
          onGoToChat={(collectorID) => {
            // Navigate to chat with specific collector
            navigate(`/chat?postId=${postID}&userId=${collectorID}`);
          }}
          onClose={() => setShowProposedPickupsModal(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;