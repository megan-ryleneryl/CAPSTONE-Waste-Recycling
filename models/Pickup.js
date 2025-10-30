// models/Pickup.js
const { getFirestore, collection, doc, updateDoc, query, where, getDocs, orderBy } = require('firebase/firestore');

class Pickup {
  constructor(data = {}) {
    // Core identifiers
    this.pickupID = data.pickupID || '';
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
    // FIXED: pickupLocation is an object with full PSGC location details, not a string
    this.pickupLocation = data.pickupLocation ? (
      typeof data.pickupLocation === 'string' ? data.pickupLocation : {
        region: {
          code: data.pickupLocation.region?.code || '',
          name: data.pickupLocation.region?.name || ''
        },
        province: data.pickupLocation.province ? {
          code: data.pickupLocation.province.code || '',
          name: data.pickupLocation.province.name || ''
        } : null,
        city: {
          code: data.pickupLocation.city?.code || '',
          name: data.pickupLocation.city?.name || ''
        },
        barangay: {
          code: data.pickupLocation.barangay?.code || '',
          name: data.pickupLocation.barangay?.name || ''
        },
        addressLine: data.pickupLocation.addressLine || '',
        coordinates: {
          lat: data.pickupLocation.coordinates?.lat || null,
          lng: data.pickupLocation.coordinates?.lng || null
        }
      }
    ) : null;
    this.contactPerson = data.contactPerson || '';
    this.contactNumber = data.contactNumber || '';
    this.alternateContact = data.alternateContact || '';
    
    
    // Status management
    this.status = data.status || 'Proposed';
    // Status flow: Proposed → Confirmed → In-Transit → ArrivedAtPickup → Completed (or Cancelled at any point)
    
    // Completion details
    this.actualWaste = data.actualWaste || [];  // Array of material objects
    this.finalAmount = data.finalAmount || 0;  // Total weight at root level
    this.paymentReceived = data.paymentReceived || 0;
    this.paymentMethod = data.paymentMethod || '';
    this.completionNotes = data.completionNotes || '';
    
    // Identity verification
    this.identityVerified = data.identityVerified || false;
    this.verificationMethod = data.verificationMethod || ''; // 'ID shown', 'App verification', etc.
    
    // Pricing details - proposed by collector
    // Array of { materialID, materialName, proposedPricePerKilo }
    this.proposedPrice = data.proposedPrice || [];

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

  // Get all pickups
  static async findAll() {
    const db = getFirestore();
    const pickupRef = collection(db, 'pickups');
    const snapshot = await getDocs(pickupRef);

    if (snapshot.empty) {
      return [];
    }

    // Map each document to a Pickup instance
    return snapshot.docs.map(doc => new Pickup({ id: doc.id, ...doc.data() }));
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
}

module.exports = Pickup;