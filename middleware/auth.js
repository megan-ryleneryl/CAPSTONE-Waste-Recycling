// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/Users');

const verifyToken = (req, res, next) => {
  try {
    console.log('🔐 Auth Middleware - All Headers:', JSON.stringify(req.headers, null, 2));
    
    // Get token from header
    const authHeader = req.headers['authorization'];
    console.log('🔑 Authorization Header:', authHeader);
    
    if (!authHeader) {
      console.log('❌ No authorization header found');
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }

    // Extract token (handle "Bearer <token>" format)
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    console.log('🎫 Extracted Token (first 50 chars):', token.substring(0, 50) + '...');

    if (!token) {
      console.log('❌ Token is empty after extraction');
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }

    // Check if JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not found in environment variables!');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    console.log('🔓 Attempting to verify token...');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified successfully:', decoded);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    console.error('Error name:', error.name);
    
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired at:', error.expiredAt);
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token format or signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Please login again.',
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
    
    if (!req.user.isCollector && !req.user.isAdmin) {
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
    
    if (!req.user.isAdmin) {
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