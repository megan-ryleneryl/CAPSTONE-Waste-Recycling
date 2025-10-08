// models/Pickup.js - Complete implementation for Module 2
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Pickup {
  constructor(data = {}) {
    // Core identifiers
    this.pickupID = data.pickupID || uuidv4();
    this.postID = data.postID || '';
    this.postType = data.postType || ''; // 'Waste' or 'Initiative'
    this.postTitle = data.postTitle || '';
    
    // User information
    this.giverID = data.giverID || '';
    this.giverName = data.giverName || '';
    this.collectorID = data.collectorID || '';
    this.collectorName = data.collectorName || '';
    this.proposedBy = data.proposedBy || ''; // userID of who proposed the schedule
    
    // Schedule details
    this.pickupDate = data.pickupDate || '';
    this.pickupTime = data.pickupTime || '';
    this.pickupLocation = data.pickupLocation || '';
    this.contactPerson = data.contactPerson || '';
    this.contactNumber = data.contactNumber || '';
    this.alternateContact = data.alternateContact || '';
    
    // Giver preferences (from profile or post)
    this.giverPreferences = {
      preferredDays: data.giverPreferences?.preferredDays || [],
      preferredTimeSlots: data.giverPreferences?.preferredTimeSlots || [],
      locationNotes: data.giverPreferences?.locationNotes || ''
    };
    
    // Expected waste details (from post)
    this.expectedWaste = {
      types: data.expectedWaste?.types || [],
      estimatedAmount: data.expectedWaste?.estimatedAmount || 0,
      unit: data.expectedWaste?.unit || 'kg',
      description: data.expectedWaste?.description || ''
    };
    
    // Status management
    this.status = data.status || 'Proposed';
    // Status flow: Proposed → Confirmed → In-Transit → ArrivedAtPickup → Completed (or Cancelled at any point)
    
    // Completion details
    this.actualWaste = {
      types: data.actualWaste?.types || [],
      finalAmount: data.actualWaste?.finalAmount || 0,
      unit: data.actualWaste?.unit || 'kg',
      notes: data.actualWaste?.notes || ''
    };
    this.paymentReceived = data.paymentReceived || 0;
    this.paymentMethod = data.paymentMethod || '';
    this.completionNotes = data.completionNotes || '';
    
    // Identity verification
    this.identityVerified = data.identityVerified || false;
    this.verificationMethod = data.verificationMethod || ''; // 'ID shown', 'App verification', etc.
    
    // Additional details
    this.specialInstructions = data.specialInstructions || '';
    this.cancellationReason = data.cancellationReason || '';
    this.cancellationBy = data.cancellationBy || ''; // userID of who cancelled
    
    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.confirmedAt = data.confirmedAt || null;
    this.inTransitAt = data.inTransitAt || null;
    this.arrivedAt = data.arrivedAt || null;
    this.completedAt = data.completedAt || null;
    this.cancelledAt = data.cancelledAt || null;
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.postID) errors.push('Post ID is required');
    if (!this.giverID) errors.push('Giver ID is required');
    if (!this.collectorID) errors.push('Collector ID is required');
    if (!this.pickupDate) errors.push('Pickup date is required');
    if (!this.pickupTime) errors.push('Pickup time is required');
    if (!this.pickupLocation) errors.push('Pickup location is required');
    if (!this.contactPerson) errors.push('Contact person is required');
    if (!this.contactNumber) errors.push('Contact number is required');
    
    // Validate phone number format (Philippine format)
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    if (this.contactNumber && !phoneRegex.test(this.contactNumber.replace(/\s+/g, ''))) {
      errors.push('Invalid contact number format');
    }
    
    // Validate pickup date is in the future
    const pickupDateTime = new Date(`${this.pickupDate} ${this.pickupTime}`);
    if (pickupDateTime <= new Date()) {
      errors.push('Pickup must be scheduled for a future date and time');
    }
    
    // Validate status
    const validStatuses = ['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid pickup status');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      pickupID: this.pickupID,
      postID: this.postID,
      postType: this.postType,
      postTitle: this.postTitle,
      giverID: this.giverID,
      giverName: this.giverName,
      collectorID: this.collectorID,
      collectorName: this.collectorName,
      proposedBy: this.proposedBy,
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime,
      pickupLocation: this.pickupLocation,
      contactPerson: this.contactPerson,
      contactNumber: this.contactNumber,
      alternateContact: this.alternateContact,
      giverPreferences: this.giverPreferences,
      expectedWaste: this.expectedWaste,
      status: this.status,
      actualWaste: this.actualWaste,
      paymentReceived: this.paymentReceived,
      paymentMethod: this.paymentMethod,
      completionNotes: this.completionNotes,
      identityVerified: this.identityVerified,
      verificationMethod: this.verificationMethod,
      specialInstructions: this.specialInstructions,
      cancellationReason: this.cancellationReason,
      cancellationBy: this.cancellationBy,
      createdAt: this.createdAt,
      confirmedAt: this.confirmedAt,
      inTransitAt: this.inTransitAt,
      arrivedAt: this.arrivedAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      updatedAt: this.updatedAt
    };
  }

  // Create new pickup
  static async create(pickupData) {
    const db = getFirestore();
    const pickup = new Pickup(pickupData);
    
    const validation = pickup.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const pickupRef = doc(db, 'pickups', pickup.pickupID);
    await setDoc(pickupRef, pickup.toFirestore());
    
    // Create a system message in the chat (sent by the collector)
    const Message = require('./Message');
    await Message.create({
      senderID: pickup.collectorID,
      receiverID: pickup.giverID,
      postID: pickup.postID,
      messageType: 'pickup_request',
      message: `[Pickup] Pickup Scheduled by Collector for ${pickup.pickupDate} at ${pickup.pickupTime}`,
      metadata: {
        pickupID: pickup.pickupID,
        scheduledDate: pickup.pickupDate,
        scheduledTime: pickup.pickupTime,
        location: pickup.pickupLocation
      }
    });
    
    return pickup;
  }

  // Get pickup by ID
  static async findById(pickupID) {
    const db = getFirestore();
    const pickupRef = doc(db, 'pickups', pickupID);
    const pickupSnap = await getDoc(pickupRef);
    
    if (!pickupSnap.exists()) {
      throw new Error('Pickup not found');
    }
    
    return new Pickup(pickupSnap.data());
  }

  // Get pickups by post
  static async findByPost(postID) {
    const db = getFirestore();
    const pickupsRef = collection(db, 'pickups');
    const q = query(
      pickupsRef,
      where('postID', '==', postID),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => new Pickup(doc.data()));
  }

  // Get user's pickups
  static async findByUser(userID, role = 'both') {
    const db = getFirestore();
    const pickupsRef = collection(db, 'pickups');
    let q;
    
    if (role === 'giver') {
      q = query(
        pickupsRef,
        where('giverID', '==', userID),
        orderBy('createdAt', 'desc')
      );
    } else if (role === 'collector') {
      q = query(
        pickupsRef,
        where('collectorID', '==', userID),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get all pickups where user is either giver or collector
      // Note: Firestore doesn't support OR queries directly, so we need two queries
      const giverQuery = query(pickupsRef, where('giverID', '==', userID));
      const collectorQuery = query(pickupsRef, where('collectorID', '==', userID));
      
      const [giverSnapshot, collectorSnapshot] = await Promise.all([
        getDocs(giverQuery),
        getDocs(collectorQuery)
      ]);
      
      const pickups = [
        ...giverSnapshot.docs.map(doc => new Pickup(doc.data())),
        ...collectorSnapshot.docs.map(doc => new Pickup(doc.data()))
      ];
      
      // Remove duplicates and sort by date
      const uniquePickups = Array.from(
        new Map(pickups.map(p => [p.pickupID, p])).values()
      );
      
      return uniquePickups.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => new Pickup(doc.data()));
  }

  // Update pickup
  async update(updates) {
    const db = getFirestore();
    const pickupRef = doc(db, 'pickups', this.pickupID);
    
    updates.updatedAt = new Date();
    
    // Update local instance
    Object.assign(this, updates);
    
    await updateDoc(pickupRef, updates);
    return this;
  }

  // Confirm pickup (by Giver)
  async confirm(confirmerID) {
    if (this.status !== 'Proposed') {
      throw new Error('Only proposed pickups can be confirmed');
    }
    
    if (confirmerID !== this.giverID) {
      throw new Error('Only the giver can confirm the pickup');
    }
    
    await this.update({
      status: 'Confirmed',
      confirmedAt: new Date()
    });
    
    // Send confirmation message (sent by the giver)
    const Message = require('./Message');
    await Message.create({
      senderID: this.giverID,
      receiverID: this.collectorID,
      postID: this.postID,
      messageType: 'system',
      message: `[Status] Pickup Confirmed by Giver`,
      metadata: {
        pickupID: this.pickupID,
        action: 'pickup_confirmed',
        pickupDate: this.pickupDate,
        pickupTime: this.pickupTime
      }
    });
  }

  // Start transit (when collector is on the way)
  async startTransit(collectorID) {
    if (this.status !== 'Confirmed') {
      throw new Error('Only confirmed pickups can be started');
    }

    if (collectorID !== this.collectorID) {
      throw new Error('Only the assigned collector can start transit');
    }

    await this.update({
      status: 'In-Transit',
      inTransitAt: new Date()
    });
  }

  // Mark as arrived at pickup location
  async arriveAtPickup(collectorID) {
    if (this.status !== 'In-Transit') {
      throw new Error('Can only arrive after being in transit');
    }

    if (collectorID !== this.collectorID) {
      throw new Error('Only the assigned collector can mark arrival');
    }

    await this.update({
      status: 'ArrivedAtPickup',
      arrivedAt: new Date()
    });
  }

  // Complete pickup (by Giver)
  async complete(completionData) {
    if (!['ArrivedAtPickup', 'In-Transit', 'Confirmed'].includes(this.status)) {
      throw new Error('Invalid pickup status for completion');
    }
    
    await this.update({
      status: 'Completed',
      completedAt: new Date(),
      actualWaste: completionData.actualWaste || this.actualWaste,
      paymentReceived: completionData.paymentReceived || 0,
      paymentMethod: completionData.paymentMethod || '',
      completionNotes: completionData.completionNotes || '',
      identityVerified: completionData.identityVerified || false,
      verificationMethod: completionData.verificationMethod || ''
    });
    
    // Update the related post status
    const Post = require('./Posts');
    await Post.updateStatus(this.postID, 'Completed');
  }

  // Cancel pickup
  async cancel(cancellerID, reason = '') {
    if (this.status === 'Completed') {
      throw new Error('Completed pickups cannot be cancelled');
    }
    
    // Check if cancellation is allowed (5 hours before pickup)
    const pickupDateTime = new Date(`${this.pickupDate} ${this.pickupTime}`);
    const hoursUntilPickup = (pickupDateTime - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilPickup < 5 && this.status === 'Confirmed') {
      throw new Error('Pickups can only be cancelled at least 5 hours before the scheduled time');
    }
    
    await this.update({
      status: 'Cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancellationBy: cancellerID
    });
    
    // Notify the other party (sent by the canceller)
    const Message = require('./Message');
    const otherUserID = cancellerID === this.giverID ? this.collectorID : this.giverID;
    const cancellerRole = cancellerID === this.giverID ? 'Giver' : 'Collector';

    await Message.create({
      senderID: cancellerID,
      receiverID: otherUserID,
      postID: this.postID,
      messageType: 'system',
      message: `[Status] Pickup Cancelled by ${cancellerRole}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        pickupID: this.pickupID,
        action: 'pickup_cancelled',
        cancelledBy: cancellerRole,
        reason: reason
      }
    });
    
    // Revert post status if it was claimed
    if (this.postType === 'Waste') {
      const Post = require('./Posts');
      await Post.updateStatus(this.postID, 'Available');
    }
  }

  // Check if pickup can be cancelled
  canBeCancelled() {
    if (this.status === 'Completed') return false;
    
    const pickupDateTime = new Date(`${this.pickupDate} ${this.pickupTime}`);
    const hoursUntilPickup = (pickupDateTime - new Date()) / (1000 * 60 * 60);
    
    return hoursUntilPickup >= 5 || this.status === 'Proposed';
  }

  // Get upcoming pickups
  static async getUpcoming(userID, role = 'both') {
    const pickups = await this.findByUser(userID, role);
    const now = new Date();
    
    return pickups.filter(pickup => {
      const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
      return pickup.status === 'Confirmed' && pickupDateTime > now;
    });
  }

  // Get active pickup for a post
  static async getActiveForPost(postID) {
    const db = getFirestore();
    const pickupsRef = collection(db, 'pickups');
    const q = query(
      pickupsRef,
      where('postID', '==', postID),
      where('status', 'in', ['Proposed', 'Confirmed', 'In-Transit', 'ArrivedAtPickup']),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return new Pickup(snapshot.docs[0].data());
  }
}

module.exports = Pickup;