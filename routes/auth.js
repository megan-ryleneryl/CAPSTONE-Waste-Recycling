const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const User = require('../models/Users');
const Application = require('../models/Application');
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

    // Create an Account_Verification application for new users
    try {
      const application = await Application.create({
        userID: user.userID,
        applicationType: 'Account_Verification',
        status: 'Pending',
        justification: 'Initial account verification',
        documents: [],
        submittedAt: new Date()
      });
    } catch (appError) {
      console.error('Failed to create application:', appError.message);
      // Don't fail the registration if application creation fails
    }
    
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
        points: user.points,
        badges: user.badges,
        isAdmin: user.userType === 'Admin',
        profilePicture: user.profilePictureUrl,  // For backward compatibility
        profilePictureUrl: user.profilePictureUrl,
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

    // Check if user is suspended
    if (user.status === 'Suspended') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been suspended. Please contact support for more information.' 
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
        badges: user.badges,
        profilePicture: user.profilePictureUrl,  // For backward compatibility
        profilePictureUrl: user.profilePictureUrl
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
    
    const { email, given_name, family_name, name, picture } = payload;
    
    // Helper function to split full name intelligently
    const splitFullName = (fullName) => {
      if (!fullName || fullName.trim() === '') {
        return { firstName: 'User', lastName: 'Account' };
      }
      
      const nameParts = fullName.trim().split(/\s+/);
      
      if (nameParts.length === 1) {
        return {
          firstName: nameParts[0],
          lastName: '.' // Minimal placeholder
        };
      } else if (nameParts.length === 2) {
        return {
          firstName: nameParts[0],
          lastName: nameParts[1]
        };
      } else {
        return {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ')
        };
      }
    };
    
    // Determine first and last names with proper logic
    let firstName, lastName;
    
    // Priority 1: Use given_name and family_name if both exist
    if (given_name && family_name) {
      firstName = given_name;
      lastName = family_name;
    } 
    // Priority 2: Use given_name if it exists (even without family_name)
    else if (given_name) {
      // Check if given_name contains multiple words
      const givenNameParts = given_name.trim().split(/\s+/);
      if (givenNameParts.length > 1) {
        // Split the given_name if it contains full name
        firstName = givenNameParts[0];
        lastName = givenNameParts.slice(1).join(' ');
      } else {
        firstName = given_name;
        lastName = family_name || '.'; // Use family_name if available, otherwise placeholder
      }
    }
    // Priority 3: Use family_name only (rare case)
    else if (family_name) {
      firstName = family_name;
      lastName = '.';
    }
    // Priority 4: Fall back to the 'name' field
    else if (name) {
      const splitName = splitFullName(name);
      firstName = splitName.firstName;
      lastName = splitName.lastName;
    }
    // Priority 5: Extract from email as last resort
    else {
      const emailName = email.split('@')[0];
      const splitEmail = splitFullName(emailName.replace(/[._-]/g, ' '));
      firstName = splitEmail.firstName;
      lastName = splitEmail.lastName;
    }
    
    // Final safety check - ensure names are not empty
    firstName = (firstName || '').trim() || 'User';
    lastName = (lastName || '').trim() || '.';
      
    // Check if user exists
    let user = await User.findByEmail(email);
    let isNewUser = false;
    
    if (!user) {
    // Create new user from Google data
    isNewUser = true;
    const salt = await bcrypt.genSalt(10);
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(randomPassword, salt);
    
    const userData = {
      firstName: firstName,
      lastName: lastName,
      email: email.toLowerCase().trim(),
      passwordHash,
      userType: 'Giver',
      status: 'Pending',
      points: 0,
      badges: [],
      phone: '',
      isOrganization: false,
      organizationName: null,
      preferredTimes: [],
      preferredLocations: [],
      createdAt: new Date(),
      authProvider: 'google',
      profilePictureUrl: picture || null
    };      
    
    user = await User.create(userData);

    // Create an Account_Verification application for new Google users (already verified)
    try {
      const application = await Application.create({
        userID: user.userID,
        applicationType: 'Account_Verification',
        status: 'Pending',
        justification: '',
        documents: [],
        submittedAt: new Date(),
      });
    } catch (appError) {
      console.error('Failed to create application for Google user:', appError.message);
    }
  } else {
    // Update existing user's profile picture if provided
    if (picture && !user.profilePictureUrl) {
      await User.update(user.userID, { profilePictureUrl: picture });
      user.profilePictureUrl = picture;
    }
  }

  // Check if user is suspended (for existing users)
  if (!isNewUser && user.status === 'Suspended') {
    return res.status(403).json({ 
      success: false, 
      message: 'Your account has been suspended. Please contact support for more information.' 
    });
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
        profilePicture: user.profilePictureUrl,  // For backward compatibility
        profilePictureUrl: user.profilePictureUrl
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