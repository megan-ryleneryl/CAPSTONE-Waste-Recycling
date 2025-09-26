// TODO
// Check for userType usage

const { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Point {
  constructor(data = {}) {
    this.pointID = data.pointID || uuidv4();
    this.userID = data.userID || '';
    this.pointsEarned = data.pointsEarned || 0;
    this.transaction = data.transaction || ''; // Post_Creation, Post_Interaction, Pickup_Completion, Initiative_Support
    this.receivedAt = data.receivedAt || new Date();
    this.description = data.description || ''; // Optional description of the transaction
  }

  // Validation
  validate() {
    const validTransactions = ['Post_Creation', 'Post_Interaction', 'Pickup_Completion', 'Initiative_Support'];
    const errors = [];
    
    if (!this.userID) errors.push('User ID is required');
    if (typeof this.pointsEarned !== 'number') errors.push('Points earned must be a number');
    if (!validTransactions.includes(this.transaction)) {
      errors.push('Valid transaction type is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      pointID: this.pointID,
      userID: this.userID,
      pointsEarned: this.pointsEarned,
      transaction: this.transaction,
      receivedAt: this.receivedAt,
      description: this.description
    };
  }

  // Static methods for database operations
  static async create(pointData) {
    const db = getFirestore();
    const point = new Point(pointData);
    
    const validation = point.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const pointRef = doc(db, 'points', point.pointID);
      await setDoc(pointRef, point.toFirestore());
      
      // Update user's total points
      const User = require('./Users');
      const user = await User.findById(point.userID);
      if (user) {
        await user.update({ 
          points: user.points + point.pointsEarned 
        });
      }
      
      return point;
    } catch (error) {
      throw new Error(`Failed to create point: ${error.message}`);
    }
  }

  static async findById(pointID) {
    const db = getFirestore();
    try {
      const pointRef = doc(db, 'points', pointID);
      const pointSnap = await getDoc(pointRef);
      
      if (pointSnap.exists()) {
        return new Point(pointSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find point: ${error.message}`);
    }
  }

  static async findByUserID(userID, limit = 100) {
    const db = getFirestore();
    try {
      const pointsRef = collection(db, 'points');
      const q = query(pointsRef, 
        where('userID', '==', userID), 
        orderBy('receivedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const points = [];
      let count = 0;
      querySnapshot.forEach((doc) => {
        if (count < limit) {
          points.push(new Point(doc.data()));
          count++;
        }
      });
      
      return points;
    } catch (error) {
      throw new Error(`Failed to find points by user: ${error.message}`);
    }
  }

  static async findByTransaction(userID, transaction) {
    const db = getFirestore();
    try {
      const pointsRef = collection(db, 'points');
      const q = query(pointsRef, 
        where('userID', '==', userID),
        where('transaction', '==', transaction),
        orderBy('receivedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const points = [];
      querySnapshot.forEach((doc) => {
        points.push(new Point(doc.data()));
      });
      
      return points;
    } catch (error) {
      throw new Error(`Failed to find points by transaction: ${error.message}`);
    }
  }

  static async getTotalPointsByUser(userID) {
    try {
      const userPoints = await Point.findByUserID(userID);
      return userPoints.reduce((total, point) => total + point.pointsEarned, 0);
    } catch (error) {
      throw new Error(`Failed to get total points: ${error.message}`);
    }
  }

  static async getPointsInPeriod(userID, startDate, endDate) {
    try {
      const userPoints = await Point.findByUserID(userID);
      const pointsInPeriod = userPoints.filter(point => 
        point.receivedAt >= startDate && point.receivedAt <= endDate
      );
      
      return {
        points: pointsInPeriod,
        total: pointsInPeriod.reduce((total, point) => total + point.pointsEarned, 0)
      };
    } catch (error) {
      throw new Error(`Failed to get points in period: ${error.message}`);
    }
  }

  static async getLeaderboard(limit = 10) {
    const db = getFirestore();
    try {
      // Get all users and calculate their points
      const User = require('./Users');
      const allUsers = await collection(db, 'users');
      const usersSnapshot = await getDocs(allUsers);
      
      const userPoints = [];
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const totalPoints = await Point.getTotalPointsByUser(userData.userID);
        userPoints.push({
          userID: userData.userID,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: userData.userType,
          totalPoints: totalPoints
        });
      }
      
      // Sort by points and return top users
      return userPoints
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get leaderboard: ${error.message}`);
    }
  }

  static async getMonthlyPointsSummary(userID) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthlyData = await Point.getPointsInPeriod(userID, startOfMonth, endOfMonth);
      
      // Group by transaction type
      const byTransaction = {};
      monthlyData.points.forEach(point => {
        if (!byTransaction[point.transaction]) {
          byTransaction[point.transaction] = {
            count: 0,
            totalPoints: 0
          };
        }
        byTransaction[point.transaction].count++;
        byTransaction[point.transaction].totalPoints += point.pointsEarned;
      });
      
      return {
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalPoints: monthlyData.total,
        transactionBreakdown: byTransaction,
        pointsHistory: monthlyData.points
      };
    } catch (error) {
      throw new Error(`Failed to get monthly points summary: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Point.create(this.toFirestore());
  }

  // Get user information for this point transaction
  async getUser() {
    const User = require('./Users');
    return await User.findById(this.userID);
  }

  // Get human readable transaction description
  getTransactionDescription() {
    const descriptions = {
      'Post_Creation': 'Created a new post',
      'Post_Interaction': 'Interacted with a post',
      'Pickup_Completion': 'Completed a pickup',
      'Initiative_Support': 'Supported an initiative'
    };
    
    return descriptions[this.transaction] || 'Unknown transaction';
  }

  // Check if this is a bonus point (positive)
  isBonus() {
    return this.pointsEarned > 0;
  }

  // Check if this is a deduction (negative)
  isDeduction() {
    return this.pointsEarned < 0;
  }

  // Get transaction age in human readable format
  getAge() {
    const now = new Date();
    const diffTime = now - this.receivedAt;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.receivedAt.toLocaleDateString();
  }
}

module.exports = Point;