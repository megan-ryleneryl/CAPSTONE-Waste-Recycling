// Organizations.js - Firestore Organization Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Organization {
  constructor(data = {}, options = {}) {
    this.organizationID = data.organizationID || uuidv4();
    this.organizationName = data.organizationName || '';
    this.members = Array.isArray(data.members) ? data.members : [];
    this.admins = Array.isArray(data.admins) ? data.admins : [];
    this.description = data.description || '';
    this.profilePicture = data.profilePicture || null;
    this.contactEmail = data.contactEmail || '';
    this.contactPhone = data.contactPhone || '';
    this.address = data.address || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.updatedAt = data.updatedAt || new Date();
    this.createdAt = data.createdAt || new Date();

    // Only validate on new creation, not when loading from DB
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
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      address: this.address,
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
    
    // If organization name is being updated, sync to all members
    if (updateData.organizationName && updateData.organizationName !== this.organizationName) {
      await this.syncNameToMembers(updateData.organizationName);
    }
    
    // Update Firestore first
    const updated = await Organization.update(this.organizationID, dataToUpdate);
    
    // Then sync the instance with the fresh data from Firestore
    Object.assign(this, updated);
    return updated;
  }

  async delete() {
    return await Organization.delete(this.organizationID);
  }

  // ============================================
  // ORGANIZATION NAME SYNC FUNCTIONS
  // ============================================
  
  /**
   * Sync organization name to all member users
   * Call this whenever organization name changes
   */
  async syncNameToMembers(newName = null) {
    const User = require('./Users');
    const nameToSync = newName || this.organizationName;
    
    try {
      // Update all members with the new organization name
      for (const memberID of this.members) {
        await User.update(memberID, { 
          organizationName: nameToSync 
        });
      }
      
      console.log(`Synced organization name to ${this.members.length} members`);
      return { success: true, memberCount: this.members.length };
    } catch (error) {
      console.error('Failed to sync organization name:', error);
      throw new Error(`Failed to sync organization name: ${error.message}`);
    }
  }
  
  /**
   * Update organization name and sync to all members
   * Use this method instead of regular update when changing name
   */
  async updateName(newName) {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Organization name cannot be empty');
    }
    
    // Update organization
    await this.update({ organizationName: newName });
    
    // Sync is handled automatically in update() method
    return this;
  }

  // ============================================
  // MEMBER MANAGEMENT METHODS
  // ============================================
  
  /**
   * Add member to organization and set their organizationName
   */
  async addMember(userID) {
    const User = require('./Users');
    
    if (this.members.includes(userID)) {
      throw new Error('User is already a member');
    }
    
    this.members.push(userID);
    
    // Update organization
    await Organization.update(this.organizationID, { members: this.members });
    
    // Update user with organizationID and organizationName
    await User.update(userID, { 
      organizationID: this.organizationID,
      organizationName: this.organizationName
    });
    
    return this;
  }

  /**
   * Remove member from organization and clear their organization data
   */
  async removeMember(userID) {
    const User = require('./Users');
    
    this.members = this.members.filter(id => id !== userID);
    
    // Also remove from admins if they were admin
    this.admins = this.admins.filter(id => id !== userID);
    
    // Update organization
    await Organization.update(this.organizationID, { 
      members: this.members,
      admins: this.admins 
    });
    
    // Clear user's organization data
    await User.update(userID, { 
      organizationID: null,
      organizationName: null
    });
    
    return this;
  }

  /**
   * Add admin (must already be member)
   */
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

  /**
   * Remove admin status (but keep as member)
   */
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