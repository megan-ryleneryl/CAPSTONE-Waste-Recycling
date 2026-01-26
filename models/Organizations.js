// Organizations.js - Firestore Organization Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Organization {
  constructor(data = {}, options = {}) {
    this.organizationID = data.organizationID || uuidv4();
    this.organizationName = data.organizationName || '';
    this.members = data.members || []; // Array of userIDs
    this.admins = data.admins || []; // Array of userIDs
    this.description = data.description || '';
    this.profilePicture = data.profilePicture || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.updatedAt = data.updatedAt || new Date();
    this.createdAt = data.createdAt || new Date();

    // Basic validation
    if (options.validateOnCreate !== false && this.organizationName.trim().length === 0) {
      throw new Error('Organization name is required');
    }
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      organizationID: this.organizationID,
      organizationName: this.organizationName,
      members: this.members,
      admins: this.admins,
      description: this.description,
      profilePicture: this.profilePicture,
      isActive: this.isActive,
      updatedAt: new Date(), // Always update timestamp
      createdAt: this.createdAt
    };
  }

  // CRUD methods
  static async create(organizationData) {
    const db = getFirestore();
    const organization = new Organization(organizationData);

    try {
      const organizationRef = doc(db, 'organizations', organization.organizationID);
      await setDoc(organizationRef, organization.toFirestore());
      return organization;
    } catch (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }
  }

  static async findById(organizationID) {
    const db = getFirestore();
    try {
      const organizationRef = doc(db, 'organizations', organizationID);
      const organizationSnap = await getDoc(organizationRef);
      
      if (organizationSnap.exists()) {
        return new Organization(organizationSnap.data(), { validateOnCreate: false });
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find organization: ${error.message}`);
    }
  }

  static async findByMember(userID) {
    const db = getFirestore();
    try {
      const orgsRef = collection(db, 'organizations');
      const q = query(orgsRef, where('members', 'array-contains', userID));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => new Organization(doc.data(), { validateOnCreate: false }));
    } catch (error) {
      throw new Error(`Failed to find organizations by member: ${error.message}`);
    }
  }

  static async findByAdmin(userID) {
    const db = getFirestore();
    try {
      const orgsRef = collection(db, 'organizations');
      const q = query(orgsRef, where('admins', 'array-contains', userID));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => new Organization(doc.data(), { validateOnCreate: false }));
    } catch (error) {
      throw new Error(`Failed to find organizations by admin: ${error.message}`);
    }
  }

  static async findAll() {
    const db = getFirestore();
    try {
      const orgsRef = collection(db, 'organizations');
      const querySnapshot = await getDocs(orgsRef);
      
      return querySnapshot.docs.map(doc => new Organization(doc.data(), { validateOnCreate: false }));
    } catch (error) {
      throw new Error(`Failed to find all organizations: ${error.message}`);
    }
  }

  static async update(organizationID, updateData) {
    const db = getFirestore();
    try {
      const organizationRef = doc(db, 'organizations', organizationID);
      await updateDoc(organizationRef, updateData);
      
      // Return updated organization
      return await Organization.findById(organizationID);
    } catch (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }
  }

  static async delete(organizationID) {
    const db = getFirestore();
    try {
      const organizationRef = doc(db, 'organizations', organizationID);
      await deleteDoc(organizationRef);
      return { success: true, organizationID };
    } catch (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }

  async update(updateData) {
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Update Firestore first
    const updated = await Organization.update(this.organizationID, dataToUpdate);
    
    // Then sync the instance with the fresh data from Firestore
    Object.assign(this, updated);
    return updated;
  }

  async delete() {
    return await Organization.delete(this.organizationID);
  }

  // Member management methods
  // Add member to organization
  async addMember(userID) {
    if (this.members.includes(userID)) {
      throw new Error('User is already a member');
    }
    
    this.members.push(userID);
    return await this.update({ members: this.members });
  }

  // Remove member from organization
  async removeMember(userID) {
    this.members = this.members.filter(id => id !== userID);
    
    // Also remove from admins if they were admin
    this.admins = this.admins.filter(id => id !== userID);
    
    return await this.update({ 
      members: this.members,
      admins: this.admins 
    });
  }

  // Add admin (must already be member)
  async addAdmin(userID) {
    if (!this.members.includes(userID)) {
      throw new Error('User must be a member before becoming admin');
    }
    
    if (this.admins.includes(userID)) {
      throw new Error('User is already an admin');
    }
    
    this.admins.push(userID);
    return await this.update({ admins: this.admins });
  }

  // Remove admin status (but keep as member)
  async removeAdmin(userID) {
    this.admins = this.admins.filter(id => id !== userID);
    return await this.update({ admins: this.admins });
  }

  // Check if user is member
  isMember(userID) {
    return this.members.includes(userID);
  }

  // Check if user is admin
  isAdmin(userID) {
    return this.admins.includes(userID);
  }
}




module.exports = Organization;