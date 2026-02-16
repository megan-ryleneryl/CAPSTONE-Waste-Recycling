// client/src/pages/PickupTracking.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BADGES } from '../config/badges';
import { CheckCircle, Truck, Package, Check, Trash2, Scale, MapPin, Calendar, Phone, User, Clock, DollarSign, FileText, MessageCircle, Navigation } from 'lucide-react';
import PickupCompletionModal from '../components/pickup/PickupCompletionModal';
import useLocationTracking from '../hooks/useLocationTracking';
import { formatDistance } from '../utils/geoUtils';
import axios from 'axios';
import styles from './PickupTracking.module.css';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PickupTracking = () => {
  const { pickupId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { pickupNotification, success, showPointsEarned, showBadgeUnlocked, showPickupPopup } = useToast();
  const [pickup, setPickup] = useState(null);
  const [postData, setPostData] = useState(null);
  const [supportData, setSupportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [showLocationPermissionDialog, setShowLocationPermissionDialog] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [showArrivalNotification, setShowArrivalNotification] = useState(false);

  // Ref to prevent multiple arrival updates
  const hasTriggeredArrival = useRef(false);
  // Ref to track previous pickup status for popup notifications
  const previousStatusRef = useRef(null);
  // Ref to access latest pickup data in callbacks
  const pickupRef = useRef(null);

  // Determine user role (needed early for hooks)
  const isGiver = currentUser?.userID === pickup?.giverID;
  const isCollector = currentUser?.userID === pickup?.collectorID;

  // Fetch available materials with prices
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/materials`);
        if (response.data.success) {
          setAvailableMaterials(response.data.materials);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      }
    };
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (!pickupId) {
      navigate('/pickups');
      return;
    }

    // OPTIMIZED: Fetch post and support data ONCE on mount, only subscribe to pickup changes
    const loadInitialData = async () => {
      try {
        const pickupRef = doc(db, 'pickups', pickupId);
        const pickupSnap = await getDoc(pickupRef);

        if (!pickupSnap.exists()) {
          console.error('Pickup not found');
          navigate('/pickups');
          return;
        }

        const pickupData = { id: pickupSnap.id, ...pickupSnap.data() };
        setPickup(pickupData);

        // Fetch post data ONCE
        if (pickupData.postID) {
          try {
            const postRef = doc(db, 'posts', pickupData.postID);
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
              const data = { id: postSnap.id, ...postSnap.data() };
              setPostData(data);
            }
          } catch (error) {
            console.error('Error fetching post data:', error);
          }
        }

        // Fetch support data ONCE
        if (pickupData.supportID) {
          try {
            const supportRef = doc(db, 'supports', pickupData.supportID);
            const supportSnap = await getDoc(supportRef);
            if (supportSnap.exists()) {
              const data = { id: supportSnap.id, ...supportSnap.data() };
              setSupportData(data);
            }
          } catch (error) {
            console.error('Error fetching support data:', error);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading pickup data:', error);
        setLoading(false);
      }
    };

    loadInitialData();

    // OPTIMIZED: Subscribe ONLY to pickup updates (not post/support)
    const pickupRef = doc(db, 'pickups', pickupId);
    const unsubscribe = onSnapshot(pickupRef, (pickupDoc) => {
      if (pickupDoc.exists()) {
        const pickupData = { id: pickupDoc.id, ...pickupDoc.data() };

        // Check if status has changed and show popup
        const previousStatus = previousStatusRef.current;
        const newStatus = pickupData.status;
        const userIsGiver = currentUser?.userID === pickupData.giverID;
        const userIsCollector = currentUser?.userID === pickupData.collectorID;

        if (previousStatus && previousStatus !== newStatus) {
          // Show popup for giver when collector updates status
          // Note: Don't show 'Completed' popup to giver - they initiated it and will see points popup
          if (userIsGiver) {
            const giverNotifyStatuses = ['In-Transit', 'ArrivedAtPickup'];
            if (giverNotifyStatuses.includes(newStatus)) {
              showPickupPopup(newStatus, {
                pickupID: pickupData.id,
                actorName: pickupData.collectorName,
                location: pickupData.pickupLocation?.city?.name || pickupData.pickupLocation?.barangay?.name || null
              });
            }
          }
          // Show popup for collector when giver confirms or completes pickup
          if (userIsCollector) {
            if (newStatus === 'Confirmed') {
              showPickupPopup(newStatus, {
                pickupID: pickupData.id,
                actorName: pickupData.giverName,
                location: pickupData.pickupLocation?.city?.name || pickupData.pickupLocation?.barangay?.name || null
              });
            }
            // Award collector points when pickup is completed (show points popup instead of pickup popup)
            if (newStatus === 'Completed') {
              showPointsEarned(15, 'Pickup Completed', {
                bonus: null,
                streak: null
              });

              // Check if this is the collector's first completed pickup
              (async () => {
                try {
                  const collectorPickupsQuery = query(
                    collection(db, 'pickups'),
                    where('collectorID', '==', currentUser?.userID),
                    where('status', '==', 'Completed')
                  );
                  const collectorPickupsSnap = await getDocs(collectorPickupsQuery);
                  if (collectorPickupsSnap.size === 1) {
                    setTimeout(() => {
                      showBadgeUnlocked(BADGES.FIRST_PICKUP);
                    }, 3500);
                  }
                } catch (err) {
                  console.error('Error checking collector first pickup:', err);
                }
              })();
            }
          }
        }

        // Update the previous status ref
        previousStatusRef.current = newStatus;

        setPickup(pickupData);
        // Update pickup ref for use in callbacks
        pickupRef.current = pickupData;
        // Post and support data remain static - no need to refetch
      }
    });

    return () => unsubscribe();
  }, [pickupId, navigate, currentUser?.userID, showPickupPopup, showPointsEarned, showBadgeUnlocked]);

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return { date: '', time: '' };
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return {
      date: dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const formatLocation = (location) => {
    if (!location) return 'Not specified';

    // If location is a string (old format), return it as is
    if (typeof location === 'string') {
      return location;
    }

    // If location is an object (new PSGC format), format it nicely
    if (typeof location === 'object') {
      const parts = [];

      if (location.addressLine) parts.push(location.addressLine);
      if (location.barangay?.name) parts.push(location.barangay.name);
      if (location.city?.name) parts.push(location.city.name);
      if (location.province?.name) parts.push(location.province.name);
      if (location.region?.name) parts.push(location.region.name);

      return parts.length > 0 ? parts.join(', ') : 'Not specified';
    }

    return 'Not specified';
  };

  const calculateEstimatedPrice = () => {
    if (!availableMaterials.length) return null;

    // For Initiative support pickups
    if (pickup?.postType === 'Initiative' && supportData?.offeredMaterials) {
      const acceptedMaterials = supportData.offeredMaterials.filter(m => m.status === 'Accepted');
      let totalPrice = 0;

      acceptedMaterials.forEach(material => {
        const foundMaterial = availableMaterials.find(m =>
          (m.displayName || m.type).toLowerCase() === material.materialName.toLowerCase()
        );

        if (foundMaterial && material.quantity) {
          totalPrice += parseFloat(material.quantity) * (foundMaterial.averagePricePerKg || 0);
        }
      });

      return totalPrice > 0 ? totalPrice : null;
    }

    // For Waste posts
    if (postData?.materials && postData?.quantity) {
      const postMaterials = Array.isArray(postData.materials) ? postData.materials : [];

      if (postMaterials.length === 0) return null;

      let totalPrice = 0;
      const quantityPerMaterial = parseFloat(postData.quantity) / postMaterials.length;

      postMaterials.forEach(material => {
        let materialName = '';

        if (typeof material === 'object') {
          materialName = material.materialName || material.type || '';
        } else {
          materialName = material;
        }

        const foundMaterial = availableMaterials.find(m =>
          (m.displayName || m.type).toLowerCase() === materialName.toLowerCase()
        );

        if (foundMaterial) {
          totalPrice += quantityPerMaterial * (foundMaterial.averagePricePerKg || 0);
        }
      });

      return totalPrice > 0 ? totalPrice : null;
    }

    return null;
  };

  const getTimelineSteps = () => {
    const steps = [
      {
        label: 'Pickup Confirmed',
        status: 'completed',
        timestamp: pickup?.confirmedAt,
        icon: 'check-circle'
      },
      {
        label: 'Collector on the Way',
        status: pickup?.status === 'In-Transit' || pickup?.status === 'ArrivedAtPickup' || pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.inTransitAt,
        icon: 'truck'
      },
      {
        label: 'Arrived at Pickup',
        status: pickup?.status === 'ArrivedAtPickup' || pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.arrivedAt,
        icon: 'package'
      },
      {
        label: 'Complete Pickup',
        status: pickup?.status === 'Completed' ? 'completed' : 'pending',
        timestamp: pickup?.completedAt,
        icon: 'check'
      }
    ];
    return steps;
  };

  // Handler for "On the Way" button - shows permission dialog first
  const handleOnTheWay = () => {
    setShowLocationPermissionDialog(true);
  };

  // Called when user accepts location permission
  const handleAcceptLocationPermission = async () => {
    setShowLocationPermissionDialog(false);
    setLocationPermissionGranted(true);
    // Now update status to In-Transit, explicitly pass true for tracking
    await handleStatusUpdate('In-Transit', true);
  };

  // Called when user denies location permission
  const handleDenyLocationPermission = async () => {
    setShowLocationPermissionDialog(false);
    setLocationPermissionGranted(false);
    // Still allow status update, but without tracking
    await handleStatusUpdate('In-Transit', false);
  };

  const handleStatusUpdate = async (newStatus, enableLocationTracking = null) => {
    setUpdating(true);
    try {
      const pickupRef = doc(db, 'pickups', pickupId);
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // Add timestamp for specific status changes
      if (newStatus === 'In-Transit') {
        updateData.inTransitAt = serverTimestamp();
        // Use explicit parameter if provided, otherwise fall back to state
        updateData.locationTrackingActive = enableLocationTracking !== null ? enableLocationTracking : locationPermissionGranted;
      } else if (newStatus === 'ArrivedAtPickup') {
        updateData.arrivedAt = serverTimestamp();
        updateData.locationTrackingActive = false;
      }

      await updateDoc(pickupRef, updateData);

      // Send notification message with current user as sender
      const messagesRef = collection(db, 'messages');
      const receiverID = isCollector ? pickup.giverID : pickup.collectorID;
      const actorName = `${currentUser.firstName} ${currentUser.lastName}`;
      const otherUserName = isCollector ? pickup.giverName : pickup.collectorName;
      const actorRole = isCollector ? 'Collector' : 'Giver';
      const otherRole = isCollector ? 'Giver' : 'Collector';

      // Generate user-friendly message with actor and guidance
      let message = '';
      if (newStatus === 'Confirmed') {
        message = `[Status] ${actorName} [${actorRole}] confirmed the pickup schedule. ${otherUserName} [${otherRole}] can now proceed with the pickup.`;
      } else if (newStatus === 'In-Transit') {
        message = `[Status] ${actorName} [${actorRole}] is on the way to the pickup location. ${otherUserName} [${otherRole}], please be ready for the pickup.`;
      } else if (newStatus === 'ArrivedAtPickup') {
        message = `[Status] ${actorName} [${actorRole}] has arrived at the pickup location. Waiting for ${otherUserName} [${otherRole}] to complete the pickup.`;
      } else if (newStatus === 'Cancelled') {
        message = `[Status] ${actorName} [${actorRole}] cancelled the pickup. This pickup has been terminated.`;
      } else {
        message = `[Status] ${getStatusLabel(newStatus)}`;
      }

      const statusMessage = {
        messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderID: currentUser.userID,
        senderName: actorName,
        receiverID: receiverID,
        receiverName: otherUserName,
        postID: pickup.postID,
        postTitle: pickup.postTitle || postData?.title || 'Pickup',
        postType: pickup.postType || postData?.postType || 'Waste',
        message: message,
        messageType: 'system',
        metadata: {
          pickupID: pickup.id,
          newStatus: newStatus,
          statusLabel: getStatusLabel(newStatus)
        },
        isRead: false,
        isDeleted: false,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      await addDoc(messagesRef, statusMessage);

      // Show toast notification for status update
      if (newStatus === 'In-Transit') {
        pickupNotification('You are now on the way to the pickup location', {
          title: 'On The Way'
        });
      } else if (newStatus === 'ArrivedAtPickup') {
        pickupNotification('You have arrived at the pickup location', {
          title: 'Arrived'
        });
      }

      // Create notification for BOTH parties
      try {
        const token = localStorage.getItem('token');
        const notificationData = {
          status: newStatus,
          pickupID: pickupId,
          giverID: pickup.giverID,
          collectorID: pickup.collectorID,
          giverName: pickup.giverName,
          collectorName: pickup.collectorName,
          location: formatLocation(pickup.pickupLocation) || formatLocation(postData?.location),
          actorRole: isCollector ? 'Collector' : 'Giver',
          postType: pickup.postType || postData?.postType || 'Waste'
        };

        await axios.post(
          `${API_BASE_URL}/api/protected/notifications/pickup-status`,
          notificationData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the status update if notification fails
      }

    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async (completionData) => {
    setUpdating(true);
    try {
      // Update material pricing history first
      try {
        const token = localStorage.getItem('token');
        const materialPricingData = completionData.wasteDetails.map(item => ({
          materialID: item.materialID,
          pricePerKg: item.pricePerKg,
          quantity: item.quantity
        }));

        const pricingResponse = await axios.post(
          `${API_BASE_URL}/api/protected/materials/update-pricing`,
          { materials: materialPricingData },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (pricingResponse.data.success) {
          console.log('✅ Material pricing history updated:', pricingResponse.data.updates);
        }
      } catch (pricingError) {
        console.error('Error updating material pricing:', pricingError);
        // Continue with pickup completion even if pricing update fails
      }

      const pickupRef = doc(db, 'pickups', pickupId);
      await updateDoc(pickupRef, {
        status: 'Completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        actualWaste: completionData.wasteDetails || [],
        paymentReceived: completionData.totalPayment || 0,
        paymentMethod: completionData.paymentMethod || '',
        completionNotes: completionData.notes || '',
        identityVerified: true,
        finalAmount: completionData.totalAmount || 0,
        locationTrackingActive: false
      });

      // Update support status if this is an initiative support pickup
      if (pickup.supportID && supportData) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${process.env.REACT_APP_API_URL}/posts/support/${pickup.supportID}/complete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              completionNotes: completionData.notes || '',
              actualMaterials: completionData.wasteDetails || []
            })
          });

          if (!response.ok) {
            console.error('Failed to update support status');
          } else {
            console.log('✅ Support status updated to Completed');
          }
        } catch (error) {
          console.error('Error updating support:', error);
          // Continue anyway - pickup is still marked as completed
        }
      }

      // Update post status (only for Waste posts, Initiative posts are updated by Support.complete())
      if (pickup.postID && pickup.postType !== 'Initiative') {
        const postRef = doc(db, 'posts', pickup.postID);
        await updateDoc(postRef, {
          status: 'Completed',
          updatedAt: serverTimestamp()
        });
      }

      // Send completion message with current user as sender
      const messagesRef = collection(db, 'messages');
      const receiverID = isCollector ? pickup.giverID : pickup.collectorID;
      const actorName = `${currentUser.firstName} ${currentUser.lastName}`;
      const otherUserName = isCollector ? pickup.giverName : pickup.collectorName;
      const actorRole = isCollector ? 'Collector' : 'Giver';

      await addDoc(messagesRef, {
        messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderID: currentUser.userID,
        senderName: actorName,
        receiverID: receiverID,
        receiverName: otherUserName,
        postID: pickup.postID,
        postTitle: pickup.postTitle || postData?.title || 'Pickup',
        postType: pickup.postType || postData?.postType || 'Waste',
        message: `[Completed] ${actorName} [${actorRole}] completed the pickup successfully. Thank you for completing this transaction!`,
        messageType: 'system',
        metadata: {
          pickupID: pickup.id,
          totalWeight: completionData.totalAmount || 0,
          totalPayment: completionData.totalPayment || 0
        },
        isRead: false,
        isDeleted: false,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      setShowCompletionModal(false);

      // Create notification for BOTH parties
      try {
        const token = localStorage.getItem('token');
        const notificationData = {
          status: 'Completed',
          pickupID: pickupId,
          giverID: pickup.giverID,
          collectorID: pickup.collectorID,
          giverName: pickup.giverName,
          collectorName: pickup.collectorName,
          location: formatLocation(pickup.pickupLocation) || formatLocation(postData?.location),
          postType: pickup.postType || postData?.postType || 'Waste'
        };

        await axios.post(
          `${API_BASE_URL}/api/protected/notifications/pickup-status`,
          notificationData,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (notifError) {
        console.error('Error creating completion notification:', notifError);
      }

      // Show success toast and points popup
      success('Pickup completed successfully! Thank you for recycling.', {
        title: 'Pickup Complete'
      });

      // Award points to the giver for completing a pickup
      showPointsEarned(15, 'Pickup Completed', {
        bonus: null,
        streak: null
      });

      // Check if this is the user's first completed pickup
      const userPickupsQuery = query(
        collection(db, 'pickups'),
        where('giverID', '==', currentUser.userID),
        where('status', '==', 'Completed')
      );
      const userPickupsSnap = await getDocs(userPickupsQuery);
      const isFirstPickup = userPickupsSnap.size === 1;

      // If first pickup, show badge unlock
      if (isFirstPickup) {
        setTimeout(() => {
          showBadgeUnlocked(BADGES.FIRST_PICKUP);
        }, 3500);
      }

      // Navigate after delay to show the popup
      setTimeout(() => {
        navigate('/pickups');
      }, isFirstPickup ? 7000 : 2500);
    } catch (error) {
      console.error('Error completing pickup:', error);
      alert('Failed to complete pickup. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'Proposed': 'Pickup Proposed by Collector',
      'Confirmed': 'Pickup Confirmed by Giver',
      'In-Transit': 'Collector on the Way',
      'ArrivedAtPickup': 'Arrived at Pickup',
      'Completed': 'Pickup Completed',
      'Cancelled': 'Pickup Cancelled'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Proposed': '#f59e0b',
      'Confirmed': '#10b981',
      'In-Transit': '#3b82f6',
      'ArrivedAtPickup': '#8b5cf6',
      'Completed': '#059669',
      'Cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  // Memoized callbacks for location tracking - use refs to avoid recreating
  const handleArrival = useCallback((arrivalData) => {
    if (hasTriggeredArrival.current) return;
    hasTriggeredArrival.current = true;
    console.log('Arrived at pickup location!', arrivalData);

    // Show arrival notification
    setShowArrivalNotification(true);

    // Use async to avoid blocking
    (async () => {
      try {
        const pickupDocRef = doc(db, 'pickups', pickupId);
        const updateData = {
          status: 'ArrivedAtPickup',
          arrivedAt: serverTimestamp(),
          locationTrackingActive: false,
          updatedAt: serverTimestamp()
        };
        await updateDoc(pickupDocRef, updateData);

        // Get current pickup data from ref
        const currentPickup = pickupRef.current;
        if (currentPickup) {
          // Send system message to giver
          const collectorName = currentPickup.collectorName || 'Collector';
          const giverName = currentPickup.giverName || 'Giver';

          const messagesRef = collection(db, 'messages');
          await addDoc(messagesRef, {
            messageID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            senderID: currentPickup.collectorID,
            senderName: collectorName,
            receiverID: currentPickup.giverID,
            receiverName: giverName,
            postID: currentPickup.postID,
            postTitle: currentPickup.postTitle || 'Pickup',
            postType: currentPickup.postType || 'Waste',
            message: `[Status] ${collectorName} [Collector] has arrived at the pickup location (auto-detected). Waiting for ${giverName} [Giver] to complete the pickup.`,
            messageType: 'system',
            metadata: {
              pickupID: pickupId,
              newStatus: 'ArrivedAtPickup',
              statusLabel: 'Arrived at Pickup',
              autoDetected: true
            },
            isRead: false,
            isDeleted: false,
            sentAt: serverTimestamp(),
            createdAt: serverTimestamp()
          });

          // Send notification API call to BOTH parties
          try {
            const token = localStorage.getItem('token');
            await axios.post(
              `${API_BASE_URL}/api/protected/notifications/pickup-status`,
              {
                status: 'ArrivedAtPickup',
                pickupID: pickupId,
                giverID: currentPickup.giverID,
                collectorID: currentPickup.collectorID,
                giverName: giverName,
                collectorName: collectorName,
                location: currentPickup.pickupLocation?.city?.name || currentPickup.pickupLocation?.barangay?.name || 'pickup location',
                postType: currentPickup.postType || 'Waste'
              },
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
          } catch (notifError) {
            console.error('Error sending arrival notification:', notifError);
          }
        }
      } catch (error) {
        console.error('Error updating arrival status:', error);
      }
    })();
  }, [pickupId]); // Only depend on pickupId which doesn't change

  const handleLocationUpdate = useCallback(async (locationData) => {
    // Use pickupId from closure instead of pickup object
    if (!pickupId) return;

    try {
      const pickupRef = doc(db, 'pickups', pickupId);
      await updateDoc(pickupRef, {
        collectorCurrentLocation: {
          lat: locationData.location.lat,
          lng: locationData.location.lng,
          accuracy: locationData.location.accuracy,
          timestamp: new Date()
        }
        // Don't update locationTrackingActive or updatedAt on every location update
        // to avoid triggering unnecessary re-renders
      });
    } catch (error) {
      console.error('Error updating collector location:', error);
    }
  }, [pickupId]); // Only depend on pickupId which doesn't change

  // Reset arrival trigger and permission when status changes away from In-Transit
  // Also restore permission if page is reloaded while In-Transit
  useEffect(() => {
    // Don't do anything if pickup hasn't loaded yet
    if (!pickup) return;

    console.log('Pickup status check:', {
      status: pickup.status,
      locationTrackingActive: pickup.locationTrackingActive,
      isCollector,
      currentUserId: currentUser?.userID,
      collectorId: pickup.collectorID
    });

    if (pickup.status === 'In-Transit') {
      if (pickup.locationTrackingActive) {
        // Restore permission if tracking was active (page reload case)
        console.log('Restoring location permission - pickup is In-Transit with tracking active');
        setLocationPermissionGranted(true);
      } else if (pickup.locationTrackingActive === undefined) {
        // Legacy pickup without locationTrackingActive field - assume tracking was enabled
        console.log('Legacy pickup detected - locationTrackingActive is undefined, enabling tracking');
        setLocationPermissionGranted(true);
      }
    } else if (pickup.status !== 'In-Transit') {
      // Only reset when explicitly not In-Transit (not when loading)
      hasTriggeredArrival.current = false;
      setLocationPermissionGranted(false);
    }
  }, [pickup, isCollector, currentUser?.userID]);

  // Get pickup location coordinates
  const targetLocation = pickup?.pickupLocation?.coordinates || null;

  // Location tracking hook - only enabled when collector is in transit AND has granted permission
  const shouldTrack = isCollector && pickup?.status === 'In-Transit' && targetLocation && locationPermissionGranted;

  // Debug logging for shouldTrack
  useEffect(() => {
    console.log('shouldTrack evaluation:', {
      shouldTrack,
      isCollector,
      status: pickup?.status,
      hasTargetLocation: !!targetLocation,
      targetLocation,
      locationPermissionGranted
    });
  }, [shouldTrack, isCollector, pickup?.status, targetLocation, locationPermissionGranted]);

  const {
    currentLocation,
    distance,
    isTracking,
    error: locationError,
    hasArrived,
  } = useLocationTracking({
    enabled: shouldTrack,
    targetLocation: targetLocation,
    arrivalRadius: 100, // 100 meters - triggers arrival when within this radius
    updateInterval: 8000, // 8 seconds
    onArrival: handleArrival,
    onLocationUpdate: handleLocationUpdate
  });

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading pickup details...</p>
      </div>
    );
  }

  if (!pickup) {
    return (
      <div className={styles.errorContainer}>
        <p>Pickup not found</p>
        <button onClick={() => navigate('/pickups')}>Back to Pickups</button>
      </div>
    );
  }

  const canUpdateStatus = isCollector && pickup.status !== 'Completed' && pickup.status !== 'Cancelled';
  const canComplete = isGiver && (pickup.status === 'ArrivedAtPickup' || pickup.status === 'In-Transit');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Pickup Status Tracking</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {pickup.status !== 'Cancelled' && (
            <button
              onClick={() => {
                const otherUserID = isGiver ? pickup.collectorID : pickup.giverID;
                const otherUserName = isGiver ? pickup.collectorName : pickup.giverName;

                // Navigate to chat with state to open the appropriate conversation
                navigate('/chat', {
                  state: {
                    postID: pickup.postID,
                    otherUser: {
                      userID: otherUserID,
                      firstName: otherUserName?.split(' ')[0] || 'Unknown',
                      lastName: otherUserName?.split(' ').slice(1).join(' ') || 'User'
                    },
                    postData: postData
                  }
                });
              }}
              className={styles.chatButton}
              title="Open Chat"
            >
              <MessageCircle size={20} />
              <span>Chat</span>
            </button>
          )}
          <div className={styles.statusBadge} style={{ backgroundColor: getStatusColor(pickup.status) }}>
            {pickup.status === 'In-Transit' ? 'In Transit' : pickup.status}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          {/* Pickup Overview Card */}
          <div className={styles.pickupInfo}>
            <div className={styles.infoHeader}>
              <h2 className={styles.pickupTitle}>{postData?.title || pickup.postTitle || 'Waste Pickup'}</h2>
              <span className={styles.pickupId}>#{pickup.id?.substring(0, 8).toUpperCase()}</span>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <Calendar className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Pickup Date</span>
                  <span className={styles.infoValue}>{pickup.pickupDate || 'TBD'}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Pickup Time</span>
                  <span className={styles.infoValue}>{pickup.pickupTime || 'TBD'}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <MapPin className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>{formatLocation(pickup.pickupLocation) || formatLocation(postData?.location)}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Scale className={styles.infoIcon} size={20} />
                <div>
                  <span className={styles.infoLabel}>Estimated Weight</span>
                  <span className={styles.infoValue}>{postData?.quantity || 'N/A'} {postData?.unit || 'kg'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.timeline}>
            {getTimelineSteps().map((step, index) => {
              const dateTime = step.timestamp ? formatDateTime(step.timestamp) : { date: '', time: '' };
              return (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineLeft}>
                    {step.timestamp ? (
                      <>
                        <span className={styles.timelineDate}>{dateTime.date}</span>
                        <span className={styles.timelineTime}>{dateTime.time}</span>
                      </>
                    ) : (
                      <span className={styles.timelinePending}>Pending</span>
                    )}
                  </div>
                  <div className={styles.timelineCenter}>
                    <div className={`${styles.timelineIcon} ${styles[step.status]}`}>
                      {step.status === 'completed' ? '✓' : '○'}
                    </div>
                    {index < getTimelineSteps().length - 1 && (
                      <div className={`${styles.timelineLine} ${
                        getTimelineSteps()[index + 1].status === 'completed' ? styles.completed : ''
                      }`} />
                    )}
                  </div>
                  <div className={styles.timelineRight}>
                    <span className={`${styles.timelineLabel} ${styles[step.status]}`}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            {/* Collector Actions */}
            {isCollector && canUpdateStatus && (
              <>
                {pickup.status === 'Confirmed' && (
                  <button
                    className={styles.primaryButton}
                    onClick={handleOnTheWay}
                    disabled={updating}
                  >
                    <Truck size={20} />
                    <span>{updating ? 'Updating...' : "I'm On the Way"}</span>
                  </button>
                )}
                {pickup.status === 'In-Transit' && (
                  <>
                    {/* Location Tracking Status */}
                    {isTracking && (
                      <div className={locationError ? styles.locationTrackingInfoWarning : styles.locationTrackingInfo}>
                        <div className={styles.trackingStatus}>
                          <Navigation size={18} className={styles.trackingIcon} />
                          <span>Location tracking active</span>
                        </div>
                        {distance !== null && (
                          <>
                            <div className={styles.distanceInfo}>
                              <MapPin size={18} />
                              <span className={styles.distanceText}>
                                {formatDistance(distance)} away from pickup location
                              </span>
                              {currentLocation?.accuracy && (
                                <span className={styles.accuracyInfo}>
                                  (±{Math.round(currentLocation.accuracy)}m)
                                </span>
                              )}
                            </div>
                            {distance <= 200 && distance > 100 && !locationError && (
                              <div className={styles.approachingAlert}>
                                <span>🎯 Almost there! Arrival will be detected automatically within 100m.</span>
                              </div>
                            )}
                          </>
                        )}
                        {locationError && (
                          <div className={styles.accuracyWarning}>
                            <span>⚠️ {locationError}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Location Error Message - Critical errors only */}
                    {!isTracking && locationError && (
                      <div className={styles.locationError}>
                        <span>⚠️ {locationError}</span>
                        <span style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          You can still manually mark arrival below.
                        </span>
                      </div>
                    )}

                    {/* Manual Arrival Button (backup) */}
                    <button
                      className={styles.primaryButton}
                      onClick={() => handleStatusUpdate('ArrivedAtPickup')}
                      disabled={updating}
                    >
                      <Package size={20} />
                      <span>{updating ? 'Updating...' : 'Arrived at Pickup'}</span>
                    </button>
                  </>
                )}
              </>
            )}

            {/* Giver Actions */}
            {isGiver && canComplete && (
              <div className={styles.completeSection}>
                <p className={styles.completeInfo}>
                  <FileText size={18} />
                  Ready to complete the pickup? Fill in the actual details below.
                </p>
                <button
                  className={styles.completeButton}
                  onClick={() => setShowCompletionModal(true)}
                  disabled={updating}
                >
                  <CheckCircle size={20} />
                  <span>Fill Completion Form</span>
                </button>
              </div>
            )}

            {/* Show message when no actions available */}
            {!canUpdateStatus && !canComplete && pickup.status !== 'Completed' && (
              <div className={styles.waitingMessage}>
                <Package size={24} />
                <p>Waiting for {isGiver ? 'collector' : 'giver'} action...</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          {/* Waste Details - Combined Section */}
          {pickup.status !== 'Completed' && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>
                <Trash2 size={20} />
                {pickup.postType === 'Initiative' && supportData ? 'Offered Materials' : 'Waste Details'}
              </h3>

              {/* For Initiative pickups with support, show offered materials */}
              {pickup.postType === 'Initiative' && supportData?.offeredMaterials ? (
                <>
                  {/* Offered Materials from Support */}
                  <div className={styles.materials}>
                    {supportData.offeredMaterials
                      .filter(m => m.status === 'Accepted')
                      .map((material, index) => (
                        <span key={index} className={styles.materialTag}>
                          {material.materialName}
                        </span>
                      ))
                    }
                  </div>

                  {/* Estimated Quantities from Support */}
                  <div className={styles.estimatedSection}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Offered Materials:</span>
                    </div>
                    {supportData.offeredMaterials
                      .filter(m => m.status === 'Accepted')
                      .map((material, index) => {
                        const foundMaterial = availableMaterials.find(m =>
                          (m.displayName || m.type).toLowerCase() === material.materialName.toLowerCase()
                        );
                        const estimatedPrice = foundMaterial && material.quantity
                          ? parseFloat(material.quantity) * (foundMaterial.averagePricePerKg || 0)
                          : null;

                        return (
                          <div key={index} className={styles.detailRow} style={{ paddingLeft: '1rem' }}>
                            <span className={styles.detailLabel}>{material.materialName}:</span>
                            <span className={styles.detailValue}>
                              {material.quantity} {material.unit || 'kg'}
                              {estimatedPrice !== null && estimatedPrice > 0 && (
                                <span style={{ fontSize: '0.875rem', color: '#059669', marginLeft: '0.5rem' }}>
                                  (≈ ₱{estimatedPrice.toFixed(2)})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })
                    }
                    {(() => {
                      const totalEstimatedPrice = calculateEstimatedPrice();
                      if (totalEstimatedPrice !== null && totalEstimatedPrice > 0) {
                        return (
                          <div className={styles.detailRow} style={{ marginTop: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
                            <span className={styles.detailLabel}>Estimated Total Price:</span>
                            <span className={styles.detailValue} style={{ color: '#059669', fontWeight: '600' }}>
                              ₱{totalEstimatedPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {supportData.notes && (
                      <div className={styles.estimateDescription}>
                        <span className={styles.detailLabel}>Notes:</span>
                        <p>{supportData.notes}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Materials for Waste posts */}
                  <div className={styles.materials}>
                    {postData?.materials ? (
                      Array.isArray(postData.materials) ? (
                        postData.materials.map((material, index) => (
                          <span key={index} className={styles.materialTag}>
                            {typeof material === 'object' ? material.materialName : material}
                          </span>
                        ))
                      ) : (
                        postData.materials.split(',').map((material, index) => (
                          <span key={index} className={styles.materialTag}>{material.trim()}</span>
                        ))
                      )
                    ) : (
                      <span className={styles.materialTag}>Mixed Waste</span>
                    )}
                  </div>

                  {/* Estimated Details for Waste posts */}
                  <div className={styles.estimatedSection}>
                    {postData?.quantity && postData.quantity > 0 && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Estimated Quantity:</span>
                        <span className={styles.detailValue}>
                          {postData.quantity} {postData.unit || 'kg'}
                        </span>
                      </div>
                    )}
                    {(() => {
                      // Prioritize proposedPrice from pickup if available
                      if (pickup?.proposedPrice && Array.isArray(pickup.proposedPrice) && pickup.proposedPrice.length > 0) {
                        // Calculate total from proposedPrice array
                        const totalProposedPrice = pickup.proposedPrice.reduce((total, material) => {
                          return total + (material.quantity * (material.proposedPricePerKilo || 0));
                        }, 0);

                        if (totalProposedPrice > 0) {
                          return (
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Estimated Price:</span>
                              <span className={styles.detailValue} style={{ color: '#059669', fontWeight: '600' }}>
                                ₱{totalProposedPrice.toFixed(2)}
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                  (proposed)
                                </span>
                              </span>
                            </div>
                          );
                        }
                      }

                      // Fall back to calculated or post price
                      const calculatedPrice = calculateEstimatedPrice();
                      const displayPrice = calculatedPrice !== null ? calculatedPrice : postData?.price;

                      if (displayPrice !== undefined && displayPrice !== null) {
                        return (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Estimated Price:</span>
                            <span className={styles.detailValue}>
                              ₱{typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}
                              {calculatedPrice !== null && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                                  (calculated)
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {postData?.condition && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Condition:</span>
                        <span className={styles.detailValue}>{postData.condition}</span>
                      </div>
                    )}
                    {postData?.description && (
                      <div className={styles.estimateDescription}>
                        <span className={styles.detailLabel}>Description:</span>
                        <p>{postData.description}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Contact Information */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              {isGiver ? <Truck size={20} /> : <User size={20} />}
              {isGiver ? 'Collector Info' : 'Giver Info'}
            </h3>
            <div className={styles.contactDetails}>
              <div className={styles.contactItem}>
                <User size={18} className={styles.contactIcon} />
                <div>
                  <span className={styles.contactLabel}>Name</span>
                  <span className={styles.contactValue}>
                    {isGiver ? pickup.collectorName : pickup.giverName}
                  </span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <Phone size={18} className={styles.contactIcon} />
                <div>
                  <span className={styles.contactLabel}>Contact</span>
                  <span className={styles.contactValue}>
                    {pickup.contactNumber || 'Not provided'}
                  </span>
                </div>
              </div>
              {pickup.alternateContact && (
                <div className={styles.contactItem}>
                  <Phone size={18} className={styles.contactIcon} />
                  <div>
                    <span className={styles.contactLabel}>Alternate</span>
                    <span className={styles.contactValue}>
                      {pickup.alternateContact}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          {pickup.specialInstructions && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>
                <FileText size={20} />
                Special Instructions
              </h3>
              <p className={styles.instructions}>{pickup.specialInstructions}</p>
            </div>
          )}

          {/* Completion Details (if completed) */}
          {pickup.status === 'Completed' && (
            <div className={styles.sidebarCard}>
              <h3 className={styles.sidebarTitle}>
                <CheckCircle size={20} />
                Actual Waste Collected
              </h3>
              <div className={styles.completionDetails}>
                {/* Waste Items Breakdown */}
                {pickup.actualWaste && pickup.actualWaste.length > 0 && (
                  <div className={styles.wasteBreakdown}>
                    <h4 className={styles.breakdownTitle}>Waste Details:</h4>
                    {pickup.actualWaste.map((item, index) => (
                      <div key={index} className={styles.wasteItem}>
                        <div className={styles.wasteItemHeader}>
                          <span className={styles.wasteType}>{item.materialName || item.type}</span>
                        </div>
                        <div className={styles.wasteItemDetails}>
                          <span className={styles.wasteAmount}>{item.quantity || item.amount} kg</span>
                          {(item.pricePerKg || item.payment) && (
                            <span className={styles.wastePayment}>
                              ₱{item.pricePerKg ? (item.quantity * item.pricePerKg).toFixed(2) : item.payment.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className={styles.summarySection}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Weight:</span>
                    <span className={styles.detailValue}>{pickup.finalAmount || 0} kg</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Payment:</span>
                    <span className={styles.detailValue}>₱{pickup.paymentReceived?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Payment Method:</span>
                    <span className={styles.detailValue}>{pickup.paymentMethod || 'N/A'}</span>
                  </div>
                </div>

                {pickup.completionNotes && (
                  <div className={styles.notes}>
                    <span className={styles.detailLabel}>Notes:</span>
                    <p>{pickup.completionNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Permission Dialog - rendered in portal to cover entire screen */}
      {showLocationPermissionDialog && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.permissionDialog}>
            <button
              className={styles.modalCloseButton}
              onClick={() => setShowLocationPermissionDialog(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className={styles.permissionHeader}>
              <MapPin size={32} className={styles.permissionIcon} />
              <h3>Enable Location Tracking?</h3>
            </div>
            <div className={styles.permissionBody}>
              <p>
                To automatically detect when you arrive at the pickup location,
                we need access to your device's location.
              </p>
              <ul className={styles.permissionFeatures}>
                <li>✓ Automatic arrival detection within 100 meters</li>
                <li>✓ Real-time distance updates every 8 seconds</li>
                <li>✓ No manual status update needed when you arrive</li>
              </ul>
              <p className={styles.permissionNote}>
                <strong>Note:</strong> Your location is only tracked while you're in transit
                and is not stored permanently. You can still manually mark arrival if you decline.
              </p>
            </div>
            <div className={styles.permissionActions}>
              <button
                className={styles.permissionDenyButton}
                onClick={handleDenyLocationPermission}
                disabled={updating}
              >
                Continue Without Tracking
              </button>
              <button
                className={styles.permissionAllowButton}
                onClick={handleAcceptLocationPermission}
                disabled={updating}
              >
                <MapPin size={18} />
                Allow Location Access
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Arrival Notification Modal - rendered in portal to cover entire screen */}
      {showArrivalNotification && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.arrivalNotification}>
            <div className={styles.arrivalIcon}>
              <CheckCircle size={48} color="#059669" />
            </div>
            <h3 className={styles.arrivalTitle}>You've Arrived!</h3>
            <p className={styles.arrivalMessage}>
              The system detected you are within the pickup area.
              Your status has been automatically updated to "Arrived at Pickup".
            </p>
            <button
              className={styles.arrivalButton}
              onClick={() => setShowArrivalNotification(false)}
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <PickupCompletionModal
          pickup={{ ...pickup, postData, supportData }}
          onComplete={handleComplete}
          onCancel={() => setShowCompletionModal(false)}
          loading={updating}
        />
      )}
    </div>
  );
};

export default PickupTracking;