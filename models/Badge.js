// Badge.js - Firestore Badge Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Badge {
  constructor(data = {}) {
    this.badgeID = data.badgeID || uuidv4();
    this.badgeName = data.badgeName || '';
    this.description = data.description || '';
    this.icon = data.icon || ''; // File path or URL to badge icon
    this.requirements = data.requirements || {}; // Object defining conditions to earn badge
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.badgeName || this.badgeName.trim().length === 0) {
      errors.push('Badge name is required');
    }
    if (this.badgeName.length > 100) {
      errors.push('Badge name must be less than 100 characters');
    }
    if (!this.description || this.description.trim().length === 0) {
      errors.push('Badge description is required');
    }
    if (!this.icon) {
      errors.push('Badge icon is required');
    }
    if (!this.requirements || Object.keys(this.requirements).length === 0) {
      errors.push('Badge requirements are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      badgeID: this.badgeID,
      badgeName: this.badgeName.trim(),
      description: this.description.trim(),
      icon: this.icon,
      requirements: this.requirements,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(badgeData) {
    const db = getFirestore();
    const badge = new Badge(badgeData);
    
    const validation = badge.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if badge name already exists
    const existingBadge = await Badge.findByName(badge.badgeName);
    if (existingBadge) {
      throw new Error('Badge with this name already exists');
    }

    try {
      const badgeRef = doc(db, 'badges', badge.badgeID);
      await setDoc(badgeRef, badge.toFirestore());
      return badge;
    } catch (error) {
      throw new Error(`Failed to create badge: ${error.message}`);
    }
  }

  static async findById(badgeID) {
    const db = getFirestore();
    try {
      const badgeRef = doc(db, 'badges', badgeID);
      const badgeSnap = await getDoc(badgeRef);
      
      if (badgeSnap.exists()) {
        return new Badge(badgeSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find badge: ${error.message}`);
    }
  }

  static async findByName(badgeName) {
    const db = getFirestore();
    try {
      const badgesRef = collection(db, 'badges');
      const q = query(badgesRef, where('badgeName', '==', badgeName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const badgeDoc = querySnapshot.docs[0];
        return new Badge(badgeDoc.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find badge by name: ${error.message}`);
    }
  }

  static async findAllActive() {
    const db = getFirestore();
    try {
      const badgesRef = collection(db, 'badges');
      const q = query(badgesRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const badges = [];
      querySnapshot.forEach((doc) => {
        badges.push(new Badge(doc.data()));
      });
      
      return badges;
    } catch (error) {
      throw new Error(`Failed to find active badges: ${error.message}`);
    }
  }

  static async findAll() {
    const db = getFirestore();
    try {
      const badgesRef = collection(db, 'badges');
      const querySnapshot = await getDocs(badgesRef);
      
      const badges = [];
      querySnapshot.forEach((doc) => {
        badges.push(new Badge(doc.data()));
      });
      
      return badges;
    } catch (error) {
      throw new Error(`Failed to find all badges: ${error.message}`);
    }
  }

  static async update(badgeID, updateData) {
    const db = getFirestore();
    try {
      updateData.updatedAt = new Date();
      const badgeRef = doc(db, 'badges', badgeID);
      await updateDoc(badgeRef, updateData);
      
      return await Badge.findById(badgeID);
    } catch (error) {
      throw new Error(`Failed to update badge: ${error.message}`);
    }
  }

  static async delete(badgeID) {
    const db = getFirestore();
    try {
      const badgeRef = doc(db, 'badges', badgeID);
      await deleteDoc(badgeRef);
      return { success: true, message: 'Badge deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete badge: ${error.message}`);
    }
  }

  // Check if user qualifies for this badge
  static async checkUserQualification(userID, badgeID) {
    try {
      const badge = await Badge.findById(badgeID);
      if (!badge || !badge.isActive) {
        return { qualifies: false, reason: 'Badge not found or inactive' };
      }

      const User = require('./User');
      const Point = require('./Point');
      const user = await User.findById(userID);
      
      if (!user) {
        return { qualifies: false, reason: 'User not found' };
      }

      // Check if user already has this badge
      const hasBadge = user.badges.some(b => b.badgeId === badgeID);
      if (hasBadge) {
        return { qualifies: false, reason: 'User already has this badge' };
      }

      const req = badge.requirements;
      let qualifies = true;
      let reason = '';

      // Check points requirement
      if (req.minPoints && user.points < req.minPoints) {
        qualifies = false;
        reason = `Requires ${req.minPoints} points, user has ${user.points}`;
      }

      // Check posts created requirement
      if (req.minPostsCreated) {
        const userPosts = await require('./Post').findByUserID(userID);
        if (userPosts.length < req.minPostsCreated) {
          qualifies = false;
          reason = `Requires ${req.minPostsCreated} posts, user has ${userPosts.length}`;
        }
      }

      // Check pickups completed requirement
      if (req.minPickupsCompleted) {
        const completedPickups = await require('./Pickup').findByCollectorID(userID);
        const completed = completedPickups.filter(p => p.status === 'Completed');
        if (completed.length < req.minPickupsCompleted) {
          qualifies = false;
          reason = `Requires ${req.minPickupsCompleted} completed pickups, user has ${completed.length}`;
        }
      }

      // Check specific transaction points
      if (req.minTransactionPoints) {
        for (const [transaction, minPoints] of Object.entries(req.minTransactionPoints)) {
          const transactionPoints = await Point.findByTransaction(userID, transaction);
          const totalTransactionPoints = transactionPoints.reduce((total, point) => total + point.pointsEarned, 0);
          
          if (totalTransactionPoints < minPoints) {
            qualifies = false;
            reason = `Requires ${minPoints} points from ${transaction}, user has ${totalTransactionPoints}`;
            break;
          }
        }
      }

      return { qualifies, reason, badge };
    } catch (error) {
      throw new Error(`Failed to check user qualification: ${error.message}`);
    }
  }

  // Award badge to user
  static async awardToUser(userID, badgeID) {
    try {
      const qualification = await Badge.checkUserQualification(userID, badgeID);
      
      if (!qualification.qualifies) {
        throw new Error(`User does not qualify for badge: ${qualification.reason}`);
      }

      const User = require('./User');
      const user = await User.findById(userID);
      
      await user.addBadge(badgeID);
      
      // Create notification
      const Notification = require('./Notification');
      await Notification.create({
        userID: userID,
        type: 'Badge',
        title: 'Badge Earned!',
        message: `Congratulations! You've earned the "${qualification.badge.badgeName}" badge`,
        referenceID: badgeID
      });

      return { success: true, badge: qualification.badge };
    } catch (error) {
      throw new Error(`Failed to award badge: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Badge.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Badge.update(this.badgeID, updateData);
  }

  async delete() {
    return await Badge.delete(this.badgeID);
  }

  async activate() {
    await this.update({ isActive: true });
  }

  async deactivate() {
    await this.update({ isActive: false });
  }

  // Get all users who have earned this badge
  async getRecipients() {
    const db = getFirestore();
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const recipients = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const hasBadge = userData.badges && userData.badges.some(b => b.badgeId === this.badgeID);
        if (hasBadge) {
          const badgeInfo = userData.badges.find(b => b.badgeId === this.badgeID);
          recipients.push({
            userID: userData.userID,
            firstName: userData.firstName,
            lastName: userData.lastName,
            earnedAt: badgeInfo.earnedAt
          });
        }
      });
      
      return recipients.sort((a, b) => b.earnedAt - a.earnedAt);
    } catch (error) {
      throw new Error(`Failed to get badge recipients: ${error.message}`);
    }
  }

  // Get requirement description in human readable format
  getRequirementDescription() {
    const req = this.requirements;
    const descriptions = [];

    if (req.minPoints) {
      descriptions.push(`Earn ${req.minPoints} points`);
    }
    
    if (req.minPostsCreated) {
      descriptions.push(`Create ${req.minPostsCreated} posts`);
    }
    
    if (req.minPickupsCompleted) {
      descriptions.push(`Complete ${req.minPickupsCompleted} pickups`);
    }
    
    if (req.minTransactionPoints) {
      for (const [transaction, points] of Object.entries(req.minTransactionPoints)) {
        const transactionName = transaction.replace('_', ' ').toLowerCase();
        descriptions.push(`Earn ${points} points from ${transactionName}`);
      }
    }

    return descriptions.length > 0 ? descriptions.join(' and ') : 'No specific requirements';
  }

  // Check badge rarity based on how many users have it
  async getRarity() {
    try {
      const recipients = await this.getRecipients();
      const totalUsers = await collection(getFirestore(), 'users');
      const usersSnapshot = await getDocs(totalUsers);
      const totalUserCount = usersSnapshot.size;
      
      const percentage = (recipients.length / totalUserCount) * 100;
      
      if (percentage < 1) return 'Legendary';
      if (percentage < 5) return 'Epic';
      if (percentage < 15) return 'Rare';
      if (percentage < 40) return 'Uncommon';
      return 'Common';
    } catch (error) {
      return 'Unknown';
    }
  }
}

module.exports = Badge;