// authService.js - Firebase Authentication service for Firestore
const { adminAuth } = require('../config/firebase');
const User = require('../models/Users');

class AuthService {
  // Create Firebase user and sync with Firestore
  async createUser(userData) {
    try {
      // Create user in Firebase Auth
      const firebaseUser = await adminAuth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: `${userData.firstName} ${userData.lastName}`,
        disabled: userData.status !== 'Verified'
      });

      // Create user in Firestore with Firebase UID
      const firestoreUser = await User.create({
        userID: firebaseUser.uid, // Use Firebase UID as Firestore userID
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        passwordHash: 'handled_by_firebase', // Firebase handles password
        phone: userData.phone,
        userType: userData.userType,
        isOrganization: userData.isOrganization || false,
        organizationName: userData.organizationName,
        status: userData.status || 'Pending'
      });

      return {
        firebaseUser,
        firestoreUser,
        success: true
      };
    } catch (error) {
      throw new Error(`User creation failed: ${error.message}`);
    }
  }

  // Verify Firebase token and get user data
  async verifyToken(idToken) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const user = await User.findById(decodedToken.uid);
      
      if (!user) {
        throw new Error('User not found in database');
      }

      return {
        firebaseUid: decodedToken.uid,
        user,
        email: decodedToken.email,
        customClaims: decodedToken
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Middleware for protecting routes
  async authenticateUser(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const verificationResult = await this.verifyToken(idToken);
      
      req.user = verificationResult.user;
      req.firebaseUid = verificationResult.firebaseUid;
      
      next();
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  }

  // Middleware for admin-only routes
  async requireAdmin(req, res, next) {
    try {
      if (!req.user || req.user.userType !== 'Admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Middleware for collector-only routes
  async requireCollector(req, res, next) {
    try {
      if (!req.user || (req.user.userType !== 'Collector' && req.user.userType !== 'Admin')) {
        return res.status(403).json({ error: 'Collector access required' });
      }
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Update user status and sync with Firebase
  async updateUserStatus(userID, status) {
    try {
      // Update in Firestore
      const user = await User.update(userID, { status });

      if (!user) {
        throw new Error('User not found');
      }

      // Update Firebase user (enable/disable based on status)
      if (adminAuth) {
        await adminAuth.updateUser(userID, {
          disabled: status !== 'Verified'
        });
      }

      return user;
    } catch (error) {
      throw new Error(`Status update failed: ${error.message}`);
    }
  }

  // Set custom claims for user roles
  async setCustomClaims(userID, claims) {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      
      await adminAuth.setCustomUserClaims(userID, claims);
      return { success: true, message: 'Custom claims set successfully' };
    } catch (error) {
      throw new Error(`Set custom claims failed: ${error.message}`);
    }
  }

  // Update user role and set custom claims
  async updateUserRole(userID, newUserType) {
    try {
      // Update in Firestore
      const user = await User.update(userID, { userType: newUserType });
      
      // Set custom claims in Firebase Auth
      await this.setCustomClaims(userID, { 
        userType: newUserType,
        isAdmin: newUserType === 'Admin',
        isCollector: newUserType === 'Collector' || newUserType === 'Admin'
      });

      return user;
    } catch (error) {
      throw new Error(`Role update failed: ${error.message}`);
    }
  }

  // Delete user from both Firebase and Firestore
  async deleteUser(userID) {
    try {
      // Delete from Firebase Auth
      if (adminAuth) {
        await adminAuth.deleteUser(userID);
      }
      
      // Delete from Firestore
      await User.delete(userID);

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      throw new Error(`User deletion failed: ${error.message}`);
    }
  }

  // Get user by Firebase UID
  async getUserByUid(uid) {
    try {
      const user = await User.findById(uid);
      return user;
    } catch (error) {
      throw new Error(`Get user failed: ${error.message}`);
    }
  }

  // Generate verification link (for email verification)
  async generateVerificationLink(email, continueUrl = null) {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      
      const actionCodeSettings = {
        url: continueUrl || `${process.env.CLIENT_URL}/verify-email`,
        handleCodeInApp: true,
      };

      const link = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
      return { link, success: true };
    } catch (error) {
      throw new Error(`Generate verification link failed: ${error.message}`);
    }
  }

  // Generate password reset link
  async generatePasswordResetLink(email, continueUrl = null) {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      
      const actionCodeSettings = {
        url: continueUrl || `${process.env.CLIENT_URL}/reset-password`,
        handleCodeInApp: true,
      };

      const link = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
      return { link, success: true };
    } catch (error) {
      throw new Error(`Generate password reset link failed: ${error.message}`);
    }
  }

  // Get all users with pagination
  async getAllUsers(pageToken = null, maxResults = 100) {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      
      const listUsersResult = await adminAuth.listUsers(maxResults, pageToken);
      
      // Get corresponding Firestore user data
      const userPromises = listUsersResult.users.map(async (firebaseUser) => {
        const firestoreUser = await User.findById(firebaseUser.uid);
        return {
          firebase: firebaseUser,
          firestore: firestoreUser
        };
      });
      
      const users = await Promise.all(userPromises);
      
      return {
        users: users.filter(u => u.firestore !== null), // Only return users that exist in Firestore
        nextPageToken: listUsersResult.pageToken,
        hasMore: !!listUsersResult.pageToken
      };
    } catch (error) {
      throw new Error(`Get all users failed: ${error.message}`);
    }
  }

  // Disable user account
  async disableUser(userID) {
    try {
      if (adminAuth) {
        await adminAuth.updateUser(userID, { disabled: true });
      }
      
      await User.update(userID, { status: 'Rejected' });
      return { success: true, message: 'User disabled successfully' };
    } catch (error) {
      throw new Error(`Disable user failed: ${error.message}`);
    }
  }

  // Enable user account
  async enableUser(userID) {
    try {
      if (adminAuth) {
        await adminAuth.updateUser(userID, { disabled: false });
      }
      
      await User.update(userID, { status: 'Verified' });
      return { success: true, message: 'User enabled successfully' };
    } catch (error) {
      throw new Error(`Enable user failed: ${error.message}`);
    }
  }

  // Check if user has specific permission
  hasPermission(user, permission) {
    const permissions = {
      'Admin': ['read', 'write', 'delete', 'admin'],
      'Collector': ['read', 'write', 'collect'],
      'Giver': ['read', 'write']
    };

    const userPermissions = permissions[user.userType] || [];
    return userPermissions.includes(permission);
  }

  // Refresh user custom claims
  async refreshUserClaims(userID) {
    try {
      const user = await User.findById(userID);
      if (!user) {
        throw new Error('User not found');
      }

      await this.setCustomClaims(userID, {
        userType: user.userType,
        status: user.status,
        isAdmin: user.userType === 'Admin',
        isCollector: user.userType === 'Collector' || user.userType === 'Admin',
        isVerified: user.status === 'Verified'
      });

      return { success: true, message: 'User claims refreshed' };
    } catch (error) {
      throw new Error(`Refresh user claims failed: ${error.message}`);
    }
  }
}

module.exports = new AuthService();