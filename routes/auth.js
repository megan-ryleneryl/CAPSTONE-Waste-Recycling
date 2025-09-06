const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const User = require('../models/Users');

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

// Complete rewrite of register endpoint
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

// Complete rewrite of login endpoint
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

module.exports = router;