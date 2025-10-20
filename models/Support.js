// models/Support.js - Tracking support contributions for initiatives
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Support {
  constructor(data = {}) {
    // Core identifiers
    this.supportID = data.supportID || uuidv4();
    this.initiativeID = data.initiativeID || ''; // postID of initiative
    this.initiativeTitle = data.initiativeTitle || '';

    // User information
    this.giverID = data.giverID || ''; // Person offering support
    this.giverName = data.giverName || '';
    this.collectorID = data.collectorID || ''; // Initiative creator
    this.collectorName = data.collectorName || '';

    // Support details - Support multiple materials
    // offeredMaterials: [{materialID, materialName, quantity, unit, status: 'Pending'/'Accepted'/'Declined', rejectionReason}]
    this.offeredMaterials = data.offeredMaterials || [];

    this.notes = data.notes || ''; // Additional notes from giver
    this.estimatedValue = data.estimatedValue || 0; // For progress tracking

    // Status management
    this.status = data.status || 'Pending';
    // Status flow:
    // - Pending: All materials pending review
    // - PartiallyAccepted: Some materials accepted, some declined
    // - Accepted: All offered materials accepted (or at least one if only one offered)
    // - PickupScheduled: Pickup scheduled for accepted materials
    // - Completed: Pickup completed
    // - Declined: All materials declined
    // - Cancelled: Support cancelled

    // Pickup relationship
    this.pickupID = data.pickupID || null; // Links to Pickup when scheduled
    this.pickupScheduled = data.pickupScheduled || false;

    // Completion details
    this.completionNotes = data.completionNotes || '';

    // Rejection/cancellation
    this.rejectionReason = data.rejectionReason || '';
    this.cancellationReason = data.cancellationReason || '';
    this.cancellationBy = data.cancellationBy || ''; // userID of who cancelled

    // Timestamps
    this.createdAt = data.createdAt || new Date();
    this.acceptedAt = data.acceptedAt || null;
    this.completedAt = data.completedAt || null;
    this.declinedAt = data.declinedAt || null;
    this.cancelledAt = data.cancelledAt || null;
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.initiativeID) errors.push('Initiative ID is required');
    if (!this.giverID) errors.push('Giver ID is required');
    if (!this.collectorID) errors.push('Collector ID is required');

    // Validate offeredMaterials
    if (!this.offeredMaterials || !Array.isArray(this.offeredMaterials) || this.offeredMaterials.length === 0) {
      errors.push('At least one offered material is required');
    } else {
      // Validate each offered material
      this.offeredMaterials.forEach((mat, index) => {
        if (!mat.materialID) errors.push(`Material ${index + 1}: materialID is required`);
        if (!mat.materialName) errors.push(`Material ${index + 1}: materialName is required`);
        if (!mat.quantity || mat.quantity <= 0) errors.push(`Material ${index + 1}: quantity must be greater than 0`);
      });
    }

    // Validate status
    const validStatuses = ['Pending', 'PartiallyAccepted', 'Accepted', 'PickupScheduled', 'Completed', 'Declined', 'Cancelled'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid support status');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      supportID: this.supportID,
      initiativeID: this.initiativeID,
      initiativeTitle: this.initiativeTitle,
      giverID: this.giverID,
      giverName: this.giverName,
      collectorID: this.collectorID,
      collectorName: this.collectorName,
      offeredMaterials: this.offeredMaterials,
      notes: this.notes,
      estimatedValue: this.estimatedValue,
      status: this.status,
      pickupID: this.pickupID,
      pickupScheduled: this.pickupScheduled,
      completionNotes: this.completionNotes,
      rejectionReason: this.rejectionReason,
      cancellationReason: this.cancellationReason,
      cancellationBy: this.cancellationBy,
      createdAt: this.createdAt,
      acceptedAt: this.acceptedAt,
      completedAt: this.completedAt,
      declinedAt: this.declinedAt,
      cancelledAt: this.cancelledAt,
      updatedAt: this.updatedAt
    };
  }

  // Create new support
  static async create(supportData) {
    const db = getFirestore();
    const support = new Support(supportData);

    const validation = support.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const supportRef = doc(db, 'supports', support.supportID);
    await setDoc(supportRef, support.toFirestore());

    return support;
  }

  // Get support by ID
  static async findById(supportID) {
    const db = getFirestore();
    const supportRef = doc(db, 'supports', supportID);
    const supportSnap = await getDoc(supportRef);

    if (!supportSnap.exists()) {
      throw new Error('Support record not found');
    }

    return new Support(supportSnap.data());
  }

  // Get all support for an initiative
  static async findByInitiative(initiativeID) {
    const db = getFirestore();
    const supportsRef = collection(db, 'supports');
    const q = query(
      supportsRef,
      where('initiativeID', '==', initiativeID),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => new Support(doc.data()));
  }

  // Get user's support contributions
  static async findByUser(userID, role = 'both') {
    const db = getFirestore();
    const supportsRef = collection(db, 'supports');
    let q;

    if (role === 'giver') {
      q = query(
        supportsRef,
        where('giverID', '==', userID),
        orderBy('createdAt', 'desc')
      );
    } else if (role === 'collector') {
      q = query(
        supportsRef,
        where('collectorID', '==', userID),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Get all supports where user is either giver or collector
      const giverQuery = query(supportsRef, where('giverID', '==', userID));
      const collectorQuery = query(supportsRef, where('collectorID', '==', userID));

      const [giverSnapshot, collectorSnapshot] = await Promise.all([
        getDocs(giverQuery),
        getDocs(collectorQuery)
      ]);

      const supports = [
        ...giverSnapshot.docs.map(doc => new Support(doc.data())),
        ...collectorSnapshot.docs.map(doc => new Support(doc.data()))
      ];

      // Remove duplicates and sort by date
      const uniqueSupports = Array.from(
        new Map(supports.map(s => [s.supportID, s])).values()
      );

      return uniqueSupports.sort((a, b) => b.createdAt - a.createdAt);
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => new Support(doc.data()));
  }

  // Update support
  async update(updates) {
    const db = getFirestore();
    const supportRef = doc(db, 'supports', this.supportID);

    updates.updatedAt = new Date();

    // Update local instance
    Object.assign(this, updates);

    await updateDoc(supportRef, updates);
    return this;
  }

  // Accept specific material (NEW: for multi-material support)
  async acceptMaterial(collectorID, materialID) {
    if (!['Pending', 'PartiallyAccepted'].includes(this.status)) {
      throw new Error('Can only accept materials from pending or partially accepted support');
    }

    if (collectorID !== this.collectorID) {
      throw new Error('Only the initiative creator can accept support offers');
    }

    // Find the material in offeredMaterials
    const materialIndex = this.offeredMaterials.findIndex(m => m.materialID === materialID);
    if (materialIndex === -1) {
      throw new Error('Material not found in support offer');
    }

    // Update material status
    this.offeredMaterials[materialIndex].status = 'Accepted';
    this.offeredMaterials[materialIndex].acceptedAt = new Date();

    // Determine overall support status
    const acceptedCount = this.offeredMaterials.filter(m => m.status === 'Accepted').length;
    const declinedCount = this.offeredMaterials.filter(m => m.status === 'Declined').length;
    const totalCount = this.offeredMaterials.length;

    let newStatus = this.status;
    if (acceptedCount === totalCount) {
      newStatus = 'Accepted'; // All accepted
    } else if (declinedCount === totalCount) {
      newStatus = 'Declined'; // All declined
    } else if (acceptedCount > 0) {
      newStatus = 'PartiallyAccepted'; // Some accepted
    }

    await this.update({
      offeredMaterials: this.offeredMaterials,
      status: newStatus,
      acceptedAt: acceptedCount > 0 && !this.acceptedAt ? new Date() : this.acceptedAt
    });

    return this;
  }

  // Decline specific material (NEW: for multi-material support)
  async declineMaterial(collectorID, materialID, reason = '') {
    if (!['Pending', 'PartiallyAccepted'].includes(this.status)) {
      throw new Error('Can only decline materials from pending or partially accepted support');
    }

    if (collectorID !== this.collectorID) {
      throw new Error('Only the initiative creator can decline support offers');
    }

    // Find the material in offeredMaterials
    const materialIndex = this.offeredMaterials.findIndex(m => m.materialID === materialID);
    if (materialIndex === -1) {
      throw new Error('Material not found in support offer');
    }

    // Update material status
    this.offeredMaterials[materialIndex].status = 'Declined';
    this.offeredMaterials[materialIndex].rejectionReason = reason;
    this.offeredMaterials[materialIndex].declinedAt = new Date();

    // Determine overall support status
    const acceptedCount = this.offeredMaterials.filter(m => m.status === 'Accepted').length;
    const declinedCount = this.offeredMaterials.filter(m => m.status === 'Declined').length;
    const totalCount = this.offeredMaterials.length;

    let newStatus = this.status;
    if (declinedCount === totalCount) {
      newStatus = 'Declined'; // All declined
    } else if (acceptedCount === totalCount) {
      newStatus = 'Accepted'; // All accepted
    } else if (acceptedCount > 0 || declinedCount > 0) {
      newStatus = 'PartiallyAccepted'; // Some accepted, some declined
    }

    await this.update({
      offeredMaterials: this.offeredMaterials,
      status: newStatus,
      declinedAt: declinedCount === totalCount && !this.declinedAt ? new Date() : this.declinedAt
    });

    return this;
  }

  // Accept ALL materials at once
  async accept(collectorID) {
    if (this.status !== 'Pending') {
      throw new Error('Only pending support offers can be accepted');
    }

    if (collectorID !== this.collectorID) {
      throw new Error('Only the initiative creator can accept support offers');
    }

    // Accept all materials
    this.offeredMaterials.forEach(mat => {
      mat.status = 'Accepted';
      mat.acceptedAt = new Date();
    });

    await this.update({
      offeredMaterials: this.offeredMaterials,
      status: 'Accepted',
      acceptedAt: new Date()
    });

    // Send acceptance message
    const Message = require('./Message');
    const materialsText = this.offeredMaterials.map(m => `${m.materialName}: ${m.quantity} ${m.unit || 'kg'}`).join(', ');

    await Message.create({
      senderID: this.collectorID,
      receiverID: this.giverID,
      postID: this.initiativeID,
      messageType: 'system',
      message: `[Status] Your support offer has been accepted! Materials: ${materialsText}`,
      metadata: {
        supportID: this.supportID,
        action: 'support_accepted',
        materials: materialsText
      }
    });
  }

  // Decline support offer (by collector/initiative creator)
  async decline(collectorID, reason = '') {
    if (this.status !== 'Pending') {
      throw new Error('Only pending support offers can be declined');
    }

    if (collectorID !== this.collectorID) {
      throw new Error('Only the initiative creator can decline support offers');
    }

    await this.update({
      status: 'Declined',
      declinedAt: new Date(),
      rejectionReason: reason
    });

    // Send decline message
    const Message = require('./Message');
    await Message.create({
      senderID: this.collectorID,
      receiverID: this.giverID,
      postID: this.initiativeID,
      messageType: 'system',
      message: `[Status] Support offer declined${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        supportID: this.supportID,
        action: 'support_declined',
        reason: reason
      }
    });
  }

  // Link to pickup when scheduled
  async linkPickup(pickupID) {
    if (this.status !== 'Accepted') {
      throw new Error('Only accepted support can be scheduled for pickup');
    }

    await this.update({
      pickupID: pickupID,
      pickupScheduled: true,
      status: 'PickupScheduled'
    });
  }

  // Complete support (when pickup is completed)
  async complete(completionData) {
    if (!['PickupScheduled', 'Accepted'].includes(this.status)) {
      throw new Error('Invalid support status for completion');
    }

    await this.update({
      status: 'Completed',
      completedAt: new Date(),
      completionNotes: completionData.completionNotes || ''
    });

    // Update initiative progress for each accepted material
    const InitiativePost = require('./InitiativePost');
    const initiative = await InitiativePost.findById(this.initiativeID);
    console.log(`🔄 Completing support for initiative ${this.initiativeID}`);
    console.log(`📦 Initiative current state: currentAmount=${initiative?.currentAmount}, targetAmount=${initiative?.targetAmount}`);

    if (initiative && initiative.materials && initiative.materials.length > 0) {
      // Update progress for each accepted material
      const acceptedMaterials = this.offeredMaterials.filter(m => m.status === 'Accepted');
      console.log(`📝 Processing ${acceptedMaterials.length} accepted materials:`, acceptedMaterials.map(m => `${m.materialName}: ${m.quantity}`));

      for (const material of acceptedMaterials) {
        console.log(`➕ Adding ${material.quantity} kg of ${material.materialName} (ID: ${material.materialID})`);
        await initiative.updateMaterialProgress(
          material.materialID,
          material.quantity
        );
      }
    } else {
      console.log('⚠️ Initiative has no materials array or was not found');
    }
  }

  // Cancel support
  async cancel(cancellerID, reason = '') {
    if (this.status === 'Completed') {
      throw new Error('Completed support cannot be cancelled');
    }

    await this.update({
      status: 'Cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
      cancellationBy: cancellerID
    });

    // Notify the other party
    const Message = require('./Message');
    const otherUserID = cancellerID === this.giverID ? this.collectorID : this.giverID;
    const cancellerRole = cancellerID === this.giverID ? 'Giver' : 'Collector';

    await Message.create({
      senderID: cancellerID,
      receiverID: otherUserID,
      postID: this.initiativeID,
      messageType: 'system',
      message: `[Status] Support Cancelled by ${cancellerRole}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        supportID: this.supportID,
        action: 'support_cancelled',
        cancelledBy: cancellerRole,
        reason: reason
      }
    });
  }

  // Get pending supports for an initiative
  static async getPendingForInitiative(initiativeID) {
    const db = getFirestore();
    const supportsRef = collection(db, 'supports');
    const q = query(
      supportsRef,
      where('initiativeID', '==', initiativeID),
      where('status', '==', 'Pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => new Support(doc.data()));
  }

  // Get accepted supports for an initiative
  static async getAcceptedForInitiative(initiativeID) {
    const db = getFirestore();
    const supportsRef = collection(db, 'supports');
    const q = query(
      supportsRef,
      where('initiativeID', '==', initiativeID),
      where('status', 'in', ['Accepted', 'PickupScheduled', 'Completed']),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => new Support(doc.data()));
  }
}

module.exports = Support;
