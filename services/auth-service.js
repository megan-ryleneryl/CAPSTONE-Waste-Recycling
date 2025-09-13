const { adminAuth } = require('../config/firebase');
const User = require('../models/Users');
const jwt = require('jsonwebtoken');

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

  // Add JWT verification method
  async verifyJWTToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Fetch fresh user data from database
      const user = await User.findById(decoded.userID);
      
      if (!user) {
        throw new Error('User not found in database');
      }
      
      return {
        firebaseUid: decoded.userID,
        user,
        email: user.email
      };
    } catch (error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  // Middleware for protecting routes
  async authenticateUser(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split('Bearer ')[1];
      
      // Try JWT verification first (since frontend uses JWT)
      try {
        const verificationResult = await this.verifyJWTToken(token);
        req.user = verificationResult.user;
        req.firebaseUid = verificationResult.firebaseUid;
        next();
      } catch (jwtError) {
        // If JWT fails, try Firebase token as fallback
        try {
          const verificationResult = await this.verifyToken(token);
          req.user = verificationResult.user;
          req.firebaseUid = verificationResult.firebaseUid;
          next();
        } catch (firebaseError) {
          console.error('Auth failed - JWT:', jwtError.message, 'Firebase:', firebaseError.message);
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  }

  // Middleware for admin-only routes
  async requireAdmin(req, res, next) {
    try {      
      if (!req.user) {
        console.error('No user found in request');
        return res.status(403).json({ error: 'Authentication required' });
      }
      
      if (req.user.userType !== 'Admin') {
        console.error('Non-admin user attempting admin access:', req.user.email);
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    } catch (error) {
      console.error('Admin middleware error:', error);
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
        try {
          await adminAuth.updateUser(userID, {
            disabled: status !== 'Verified'
          });
        } catch (firebaseError) {
          console.log('Firebase update skipped (user may not exist in Firebase):', firebaseError.message);
        }
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
        console.log('Firebase Admin not initialized, skipping custom claims');
        return { success: true, message: 'Custom claims skipped (no Firebase)' };
      }
      
      try {
        await adminAuth.setCustomUserClaims(userID, claims);
        return { success: true, message: 'Custom claims set successfully' };
      } catch (firebaseError) {
        console.log('Firebase custom claims skipped:', firebaseError.message);
        return { success: true, message: 'Custom claims skipped' };
      }
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
        try {
          await adminAuth.deleteUser(userID);
        } catch (firebaseError) {
          console.log('Firebase deletion skipped:', firebaseError.message);
        }
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
      
      const link = await adminAuth.generateEmailVerificationLink(email, {
        url: continueUrl || process.env.APP_URL
      });

      return link;
    } catch (error) {
      throw new Error(`Generate verification link failed: ${error.message}`);
    }
  }

  // Get all users (admin function)
  async getAllUsers(pageSize = 100, pageToken = null) {
    try {
      const users = await User.findAll();
      
      // Optional: sync with Firebase Auth if needed
      let firebaseUsers = [];
      if (adminAuth) {
        try {
          const listUsersResult = await adminAuth.listUsers(pageSize, pageToken);
          firebaseUsers = listUsersResult.users;
        } catch (firebaseError) {
          console.log('Firebase user list skipped:', firebaseError.message);
        }
      }

      return {
        users,
        firebaseUsers,
        hasMore: false
      };
    } catch (error) {
      throw new Error(`Get all users failed: ${error.message}`);
    }
  }

  // Disable user account
  async disableUser(userID) {
    try {
      if (adminAuth) {
        try {
          await adminAuth.updateUser(userID, { disabled: true });
        } catch (firebaseError) {
          console.log('Firebase disable skipped:', firebaseError.message);
        }
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
        try {
          await adminAuth.updateUser(userID, { disabled: false });
        } catch (firebaseError) {
          console.log('Firebase enable skipped:', firebaseError.message);
        }
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