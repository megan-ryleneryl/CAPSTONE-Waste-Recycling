// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/Users');

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please login.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Fetch fresh user data from database
      const user = await User.findById(decoded.userID);
      
      if (!user) {
        console.log('User not found for ID:', decoded.userID);
        return res.status(401).json({ 
          success: false,
          message: 'User not found. Please login again.' 
        });
      }
      
      // Check if user is active
      if (user.status !== 'Active') {
        return res.status(403).json({ 
          success: false,
          message: 'Your account is not active. Please contact support.' 
        });
      }
      
      // Attach user to request object
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired. Please login again.',
          expired: true
        });
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Authentication error',
      error: error.message 
    });
  }
};

// Middleware to check if user is a Collector or Admin
const requireCollector = async (req, res, next) => {
  try {
    // This middleware should be used after verifyToken
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    if (req.user.userType !== 'Collector' && req.user.userType !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Only Collectors and Admins can perform this action.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Collector check error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Authorization error',
      error: error.message 
    });
  }
};

// Middleware to check if user is an Admin
const requireAdmin = async (req, res, next) => {
  try {
    // This middleware should be used after verifyToken
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }
    
    if (req.user.userType !== 'Admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Authorization error',
      error: error.message 
    });
  }
};

module.exports = {
  verifyToken,
  requireCollector,
  requireAdmin
};