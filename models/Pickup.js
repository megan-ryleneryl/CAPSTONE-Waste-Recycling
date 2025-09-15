// Pickup.js - Firestore Pickup Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Pickup {
  constructor(data = {}) {
    this.pickupID = data.pickupID || uuidv4();
    this.postID = data.postID || '';
    this.giverID = data.giverID || '';
    this.collectorID = data.collectorID || '';
    this.pickupTime = data.pickupTime || null;
    this.pickupLocation = data.pickupLocation || '';
    this.status = data.status || 'Proposed'; // Proposed, Confirmed, Completed, Cancelled
    this.finalWaste = data.finalWaste || null; // {itemName, materialIDs, price, kg}
    this.proofOfPickup = data.proofOfPickup || null; // File path or URL
    this.proposedAt = data.proposedAt || new Date();
    this.confirmedAt = data.confirmedAt || null;
    this.completedAt = data.completedAt || null;
    this.cancelledAt = data.cancelledAt || null;
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.postID) errors.push('Post ID is required');
    if (!this.giverID) errors.push('Giver ID is required');
    if (!this.collectorID) errors.push('Collector ID is required');
    if (!this.pickupLocation) errors.push('Pickup location is required');
    if (!['Proposed', 'Confirmed', 'Completed', 'Cancelled'].includes(this.status)) {
      errors.push('Valid status is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      pickupID: this.pickupID,
      postID: this.postID,
      giverID: this.giverID,
      collectorID: this.collectorID,
      pickupTime: this.pickupTime,
      pickupLocation: this.pickupLocation,
      status: this.status,
      finalWaste: this.finalWaste,
      proofOfPickup: this.proofOfPickup,
      proposedAt: this.proposedAt,
      confirmedAt: this.confirmedAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt
    };
  }

  // Static methods for database operations
  static async create(pickupData) {
    const db = getFirestore();
    const pickup = new Pickup(pickupData);
    
    const validation = pickup.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const pickupRef = doc(db, 'pickups', pickup.pickupID);
      await setDoc(pickupRef, pickup.toFirestore());
      
      // Create notification for giver
      const Notification = require('./Notification');
      await Notification.create({
        userID: pickup.giverID,
        type: 'Pickup',
        title: 'New Pickup Request',
        message: `Someone wants to collect your waste at ${pickup.pickupLocation}`,
        referenceID: pickup.pickupID
      });
      
      return pickup;
    } catch (error) {
      throw new Error(`Failed to create pickup: ${error.message}`);
    }
  }

  static async findById(pickupID) {
    const db = getFirestore();
    try {
      const pickupRef = doc(db, 'pickups', pickupID);
      const pickupSnap = await getDoc(pickupRef);
      
      if (pickupSnap.exists()) {
        return new Pickup(pickupSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find pickup: ${error.message}`);
    }
  }

  static async findByPostID(postID) {
    const db = getFirestore();
    try {
      const pickupsRef = collection(db, 'pickups');
      const q = query(pickupsRef, where('postID', '==', postID), orderBy('proposedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const pickups = [];
      querySnapshot.forEach((doc) => {
        pickups.push(new Pickup(doc.data()));
      });
      
      return pickups;
    } catch (error) {
      throw new Error(`Failed to find pickups by post: ${error.message}`);
    }
  }

  static async findByGiverID(giverID) {
    const db = getFirestore();
    try {
      const pickupsRef = collection(db, 'pickups');
      const q = query(pickupsRef, where('giverID', '==', giverID), orderBy('proposedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const pickups = [];
      querySnapshot.forEach((doc) => {
        pickups.push(new Pickup(doc.data()));
      });
      
      return pickups;
    } catch (error) {
      throw new Error(`Failed to find pickups by giver: ${error.message}`);
    }
  }

  static async findByCollectorID(collectorID) {
    const db = getFirestore();
    try {
      const pickupsRef = collection(db, 'pickups');
      const q = query(pickupsRef, where('collectorID', '==', collectorID), orderBy('proposedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const pickups = [];
      querySnapshot.forEach((doc) => {
        pickups.push(new Pickup(doc.data()));
      });
      
      return pickups;
    } catch (error) {
      throw new Error(`Failed to find pickups by collector: ${error.message}`);
    }
  }

  static async findByStatus(status) {
    const db = getFirestore();
    try {
      const pickupsRef = collection(db, 'pickups');
      const q = query(pickupsRef, where('status', '==', status), orderBy('proposedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const pickups = [];
      querySnapshot.forEach((doc) => {
        pickups.push(new Pickup(doc.data()));
      });
      
      return pickups;
    } catch (error) {
      throw new Error(`Failed to find pickups by status: ${error.message}`);
    }
  }

  static async update(pickupID, updateData) {
    const db = getFirestore();
    try {
      const pickupRef = doc(db, 'pickups', pickupID);
      await updateDoc(pickupRef, updateData);
      
      return await Pickup.findById(pickupID);
    } catch (error) {
      throw new Error(`Failed to update pickup: ${error.message}`);
    }
  }

  static async delete(pickupID) {
    const db = getFirestore();
    try {
      const pickupRef = doc(db, 'pickups', pickupID);
      await deleteDoc(pickupRef);
      return { success: true, message: 'Pickup deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete pickup: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Pickup.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Pickup.update(this.pickupID, updateData);
  }

  async delete() {
    return await Pickup.delete(this.pickupID);
  }

  // Confirm pickup
  async confirm() {
    if (this.status !== 'Proposed') {
      throw new Error('Only proposed pickups can be confirmed');
    }
    
    await this.update({
      status: 'Confirmed',
      confirmedAt: new Date()
    });

    // Notify collector
    const Notification = require('./Notification');
    await Notification.create({
      userID: this.collectorID,
      type: 'Pickup',
      title: 'Pickup Confirmed',
      message: `Your pickup at ${this.pickupLocation} has been confirmed`,
      referenceID: this.pickupID
    });
  }

  // Complete pickup
  async complete(finalWasteData, proofOfPickupURL = null) {
    if (this.status !== 'Confirmed') {
      throw new Error('Only confirmed pickups can be completed');
    }
    
    const updateData = {
      status: 'Completed',
      completedAt: new Date(),
      finalWaste: finalWasteData
    };
    
    if (proofOfPickupURL) {
      updateData.proofOfPickup = proofOfPickupURL;
    }
    
    await this.update(updateData);
    
    // Award points to both giver and collector
    const Point = require('./Point');
    await Point.create({
      userID: this.giverID,
      pointsEarned: 10,
      transaction: 'Pickup_Completion'
    });
    
    await Point.create({
      userID: this.collectorID,
      pointsEarned: 15,
      transaction: 'Pickup_Completion'
    });

    // Notify both parties
    const Notification = require('./Notification');
    await Notification.create({
      userID: this.giverID,
      type: 'Pickup',
      title: 'Pickup Completed',
      message: `Your waste pickup at ${this.pickupLocation} has been completed`,
      referenceID: this.pickupID
    });

    await Notification.create({
      userID: this.collectorID,
      type: 'Pickup',
      title: 'Pickup Completed',
      message: `You successfully completed the pickup at ${this.pickupLocation}`,
      referenceID: this.pickupID
    });
  }

  // Cancel pickup
  async cancel(reason = null) {
    if (this.status === 'Completed') {
      throw new Error('Completed pickups cannot be cancelled');
    }
    
    const updateData = {
      status: 'Cancelled',
      cancelledAt: new Date()
    };
    
    if (reason) {
      updateData.cancellationReason = reason;
    }
    
    await this.update(updateData);

    // Notify the other party
    const Notification = require('./Notification');
    const notifyUserID = this.status === 'Proposed' ? this.giverID : this.collectorID;
    
    await Notification.create({
      userID: notifyUserID,
      type: 'Pickup',
      title: 'Pickup Cancelled',
      message: `The pickup at ${this.pickupLocation} has been cancelled`,
      referenceID: this.pickupID
    });
  }

  // Check if pickup is overdue
  isOverdue() {
    if (!this.pickupTime || this.status !== 'Confirmed') return false;
    return new Date() > this.pickupTime;
  }

  // Get time until pickup
  getTimeUntilPickup() {
    if (!this.pickupTime) return null;
    const now = new Date();
    const diffTime = this.pickupTime - now;
    
    if (diffTime <= 0) return { overdue: true };
    
    return {
      hours: Math.floor(diffTime / (1000 * 60 * 60)),
      minutes: Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60)),
      overdue: false
    };
  }

  // Get pickup duration (for completed pickups)
  getPickupDuration() {
    if (!this.proposedAt || !this.completedAt) return null;
    
    const diffTime = this.completedAt - this.proposedAt;
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours };
  }

  // Get related post information
  async getPost() {
    const Post = require('./Post');
    return await Post.findById(this.postID);
  }

  // Get giver information
  async getGiver() {
    const User = require('./Users');
    return await User.findById(this.giverID);
  }

  // Get collector information
  async getCollector() {
    const User = require('./Users');
    return await User.findById(this.collectorID);
  }

  // Check if pickup can be cancelled
  canBeCancelled() {
    return this.status === 'Proposed' || this.status === 'Confirmed';
  }

  // Check if pickup can be confirmed
  canBeConfirmed() {
    return this.status === 'Proposed';
  }

  // Check if pickup can be completed
  canBeCompleted() {
    return this.status === 'Confirmed';
  }

  // Get status color for UI
  getStatusColor() {
    const colors = {
      'Proposed': '#FFA500', // Orange
      'Confirmed': '#4CAF50', // Green
      'Completed': '#2196F3', // Blue
      'Cancelled': '#F44336'  // Red
    };
    
    return colors[this.status] || '#9E9E9E'; // Default gray
  }

  // Get human-readable status
  getStatusDescription() {
    const descriptions = {
      'Proposed': 'Waiting for confirmation',
      'Confirmed': 'Pickup confirmed and scheduled',
      'Completed': 'Pickup successfully completed',
      'Cancelled': 'Pickup was cancelled'
    };
    
    return descriptions[this.status] || this.status;
  }
}

module.exports = Pickup;