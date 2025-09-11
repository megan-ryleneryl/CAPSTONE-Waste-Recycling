// User.js - Firestore User Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data = {}) {
    this.userID = data.userID || uuidv4();
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.passwordHash = data.passwordHash || '';
    this.status = data.status || 'Pending'; // Pending, Verified, Submitted, Rejected
    this.userType = data.userType || ''; // Giver, Collector, Admin
    this.isOrganization = data.isOrganization || false;
    this.organizationName = data.organizationName || null;
    this.preferredTimes = data.preferredTimes || [];
    this.preferredLocations = data.preferredLocations || [];
    this.points = data.points || 0;
    this.badges = data.badges || []; // Array of {badgeId, earnedAt}
    this.createdAt = data.createdAt || new Date();
    this.profilePictureUrl = data.profilePictureUrl || '';
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.firstName) errors.push('First name is required');
    if (!this.lastName) errors.push('Last name is required');
    if (!this.email) errors.push('Email is required');
    if (!this.userType || !['Giver', 'Collector', 'Admin'].includes(this.userType)) {
      errors.push('Valid user type is required');
    }
    if (!['Pending', 'Verified', 'Submitted', 'Rejected'].includes(this.status)) {
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
      userID: this.userID,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      passwordHash: this.passwordHash,
      status: this.status,
      userType: this.userType,
      isOrganization: this.isOrganization,
      organizationName: this.organizationName,
      preferredTimes: this.preferredTimes,
      preferredLocations: this.preferredLocations,
      points: this.points,
      badges: this.badges,
      createdAt: this.createdAt,
      profilePictureUrl: this.profilePictureUrl
    };
  }

  // Static methods for database operations
  static async create(userData) {
    const db = getFirestore();
    const user = new User(userData);
    
    const validation = user.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const userRef = doc(db, 'users', user.userID);
      await setDoc(userRef, user.toFirestore());
      return user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  static async findById(userID) {
    const db = getFirestore();
    try {
      const userRef = doc(db, 'users', userID);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return new User(userSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    const db = getFirestore();
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return new User(userDoc.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  static async findByUserType(userType) {
    const db = getFirestore();
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('userType', '==', userType));
      const querySnapshot = await getDocs(q);
      
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push(new User(doc.data()));
      });
      
      return users;
    } catch (error) {
      throw new Error(`Failed to find users by type: ${error.message}`);
    }
  }

  static async update(userID, updateData) {
    const db = getFirestore();
    try {
      const userRef = doc(db, 'users', userID);
      await updateDoc(userRef, updateData);
      
      // Return updated user
      return await User.findById(userID);
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  static async delete(userID) {
    const db = getFirestore();
    try {
      const userRef = doc(db, 'users', userID);
      await deleteDoc(userRef);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await User.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await User.update(this.userID, updateData);
  }

  async delete() {
    return await User.delete(this.userID);
  }

  // Add points to user
  async addPoints(points, transaction) {
    this.points += points;
    await this.update({ points: this.points });
    
    // Also create a point record
    const Point = require('./Point');
    await Point.create({
      userID: this.userID,
      pointsEarned: points,
      transaction: transaction
    });
  }

  // Add badge to user
  async addBadge(badgeId) {
    const badgeExists = this.badges.find(b => b.badgeId === badgeId);
    if (!badgeExists) {
      this.badges.push({
        badgeId: badgeId,
        earnedAt: new Date()
      });
      await this.update({ badges: this.badges });
    }
  }
}

module.exports = User;