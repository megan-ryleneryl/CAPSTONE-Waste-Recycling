const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/users_model');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userID: user.userID, 
      email: user.email,
      userType: user.userType 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, userType = 'Giver' } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const userData = {
      firstName: username.split(' ')[0] || username,
      lastName: username.split(' ').slice(1).join(' ') || '',
      email,
      passwordHash,
      userType,
      status: 'Pending',
      points: 0,
      badges: [],
      createdAt: new Date()
    };

    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        userID: user.userID,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (user.status === 'Rejected') {
      return res.status(403).json({ message: 'Account has been rejected' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
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
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
});

// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    // Check if user exists
    let user = await User.findByEmail(email);

    if (!user) {
      // Create new user from Google data
      const userData = {
        firstName: given_name || '',
        lastName: family_name || '',
        email,
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
        userType: 'Giver',
        status: 'Verified', // Auto-verify Google users
        points: 0,
        badges: [],
        createdAt: new Date()
      };

      user = await User.create(userData);
    }

    // Generate token
    const jwtToken = generateToken(user);

    res.json({
      message: 'Google login successful',
      token: jwtToken,
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
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Error during Google login', error: error.message });
  }
});

module.exports = router;