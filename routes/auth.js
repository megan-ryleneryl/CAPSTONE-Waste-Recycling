const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const User = require('../models/Users');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Add JWT token generator
const generateToken = (user) => {
  return jwt.sign(
    { 
      userID: user.userID, 
      email: user.email,
      userType: user.userType,
      status: user.status
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, userType = 'Giver' } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user data with ALL defaults from Users.js model
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      userType,
      status: 'Pending', // Default status
      points: 0, // Default points
      badges: [], // Empty badges array
      phone: '', // Default empty phone
      isOrganization: false, // Default not organization
      organizationName: null,
      preferredTimes: [],
      preferredLocations: [],
      createdAt: new Date()
    };

    // Create user in Firestore
    const user = await User.create(userData);
    
    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        userID: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        status: user.status,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating user', 
      error: error.message 
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is rejected
    if (user.status === 'Rejected') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been rejected. Please contact support.' 
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userID: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        status: user.status,
        points: user.points,
        badges: user.badges
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login', 
      error: error.message 
    });
  }
});

// Google Authentication Route
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;
    
    // Check if user exists
    let user = await User.findByEmail(email);
    let isNewUser = false;
    
    if (!user) {
      // Create new user from Google data
      isNewUser = true;
      const salt = await bcrypt.genSalt(10);
      const randomPassword = Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(randomPassword, salt);
      
      const userData = {
        firstName: given_name || '',
        lastName: family_name || '',
        email: email.toLowerCase().trim(),
        passwordHash, // Random password since they're using Google
        userType: 'Giver', // Default type
        status: 'Verified', // Auto-verify Google users
        points: 0,
        badges: [],
        phone: '',
        isOrganization: false,
        organizationName: null,
        preferredTimes: [],
        preferredLocations: [],
        createdAt: new Date(),
        authProvider: 'google', // Track that this is a Google user
        profilePicture: picture || null
      };
      
      user = await User.create(userData);
    }
    
    // Generate JWT token
    const jwtToken = generateToken(user);
    
    res.json({
      success: true,
      message: isNewUser ? 'Account created successfully via Google' : 'Login successful',
      token: jwtToken,
      isNewUser,
      user: {
        userID: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        status: user.status,
        points: user.points,
        badges: user.badges,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Google authentication failed',
      error: error.message 
    });
  }
});

module.exports = router;