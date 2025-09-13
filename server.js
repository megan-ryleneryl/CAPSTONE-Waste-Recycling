// server.js - Express server setup with local file storage
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profileRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Import services
const authService = require('./services/auth-service'); 
const { StorageService, upload, serveUploads } = require('./services/storage-service'); 
const notificationService = require('./services/notification-service'); 

// Import models
const User = require('./models/Users'); 
const Post = require('./models/Posts'); 
const WastePost = require('./models/WastePost');
const Application = require('./models/Application'); 
const Pickup = require('./models/Pickup');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for static files
  skip: (req) => req.path.startsWith('/uploads')
});
app.use('/api/', limiter);

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message: 'Capstone Recycling Platform API is running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/protected/profile', profileRoutes);
app.use('/api/messages', messageRoutes);

app.use('/api/admin', (req, res, next) => {
  next();
});

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await authService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        uid: result.firebaseUser.uid,
        email: result.firebaseUser.email,
        userType: result.firestoreUser.userType,
        firstName: result.firestoreUser.firstName,
        lastName: result.firestoreUser.lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Firebase ID token is required' 
      });
    }

    const verificationResult = await authService.verifyToken(idToken);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: verificationResult.firebaseUid,
        email: verificationResult.email,
        userType: verificationResult.user.userType,
        firstName: verificationResult.user.firstName,
        lastName: verificationResult.user.lastName,
        points: verificationResult.user.points
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ success: false, error: error.message });
  }
});

// Get public posts (for browsing without login)
app.get('/api/posts/public', async (req, res) => {
  try {
    const { type = 'Waste', limit = 20 } = req.query;
    const posts = await Post.findByType(type);
    
    // Return limited public data
    const publicPosts = posts.slice(0, parseInt(limit)).map(post => ({
      postID: post.postID,
      title: post.title,
      description: post.description,
      location: post.location,
      status: post.status,
      createdAt: post.createdAt,
      // Hide sensitive user data for public view
      userType: post.userType
    }));
    
    res.json({ success: true, posts: publicPosts });
  } catch (error) {
    console.error('Public posts error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PROTECTED ROUTES (Authentication required)
// ============================================================================

app.use('/api/protected', authService.authenticateUser.bind(authService));

// User routes
app.get('/api/protected/profile', async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/protected/profile', async (req, res) => {
  try {
    const updatedUser = await User.update(req.user.userID, req.body);
    res.json({ success: true, user: updatedUser, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Posts routes
app.get('/api/protected/posts', async (req, res) => {
  try {
    const { type, status, location, userId } = req.query;
    
    let posts;
    if (userId) {
      posts = await Post.findByUserID(userId);
    } else if (type) {
      posts = await Post.findByType(type);
    } else if (status) {
      posts = await Post.findByStatus(status);
    } else if (location) {
      posts = await Post.findByLocation(location);
    } else {
      // Get all waste posts by default
      posts = await Post.findByType('Waste');
    }
    
    res.json({ success: true, posts });
  } catch (error) {
    console.error('Posts fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/protected/posts/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    res.json({ success: true, post });
  } catch (error) {
    console.error('Post fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/protected/posts/waste', async (req, res) => {
  try {
    const wastePostData = {
      ...req.body,
      userID: req.user.userID
    };
    
    const wastePost = await WastePost.create(wastePostData);
    
    // Award points for creating a post
    const Point = require('./models/Point');
    await Point.create({
      userID: req.user.userID,
      pointsEarned: 5,
      transaction: 'Post_Creation',
      description: `Created waste post: ${wastePost.title}`
    });
    
    res.status(201).json({ 
      success: true, 
      post: wastePost,
      message: 'Waste post created successfully. You earned 5 points!'
    });
  } catch (error) {
    console.error('Waste post creation error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/protected/posts/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    
    // Check if user owns the post or is admin
    if (post.userID !== req.user.userID && req.user.userType !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized to edit this post' });
    }
    
    const updatedPost = await Post.update(req.params.postId, req.body);
    res.json({ success: true, post: updatedPost, message: 'Post updated successfully' });
  } catch (error) {
    console.error('Post update error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Pickup routes
app.get('/api/protected/pickups', async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    let pickups;
    
    if (type === 'given') {
      pickups = await Pickup.findByGiverID(req.user.userID);
    } else if (type === 'collected') {
      pickups = await Pickup.findByCollectorID(req.user.userID);
    } else {
      // Get all pickups for this user (both given and collected)
      const givenPickups = await Pickup.findByGiverID(req.user.userID);
      const collectedPickups = await Pickup.findByCollectorID(req.user.userID);
      pickups = [...givenPickups, ...collectedPickups];
    }
    
    res.json({ success: true, pickups });
  } catch (error) {
    console.error('Pickups fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/protected/pickups', async (req, res) => {
  try {
    const pickupData = {
      ...req.body,
      collectorID: req.user.userID
    };
    
    const pickup = await Pickup.create(pickupData);
    res.status(201).json({ 
      success: true, 
      pickup, 
      message: 'Pickup request created successfully' 
    });
  } catch (error) {
    console.error('Pickup creation error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/protected/pickups/:pickupId/confirm', async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.pickupId);
    if (!pickup) {
      return res.status(404).json({ success: false, error: 'Pickup not found' });
    }
    
    // Only the giver can confirm pickups
    if (pickup.giverID !== req.user.userID) {
      return res.status(403).json({ success: false, error: 'Unauthorized to confirm this pickup' });
    }
    
    await pickup.confirm();
    res.json({ success: true, pickup, message: 'Pickup confirmed successfully' });
  } catch (error) {
    console.error('Pickup confirm error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// File upload routes
app.post('/api/protected/upload/application-documents', 
  upload.array('documents', 5), 
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }

      const applicationID = req.body.applicationID;
      if (!applicationID) {
        return res.status(400).json({ success: false, error: 'Application ID is required' });
      }

      const uploadedFiles = await StorageService.uploadApplicationDocuments(req.files, applicationID);
      
      res.json({ 
        success: true, 
        message: 'Documents uploaded successfully',
        files: uploadedFiles 
      });
    } catch (error) {
      console.error('Document upload error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

app.post('/api/protected/upload/proof-of-pickup', 
  upload.single('proof'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const pickupID = req.body.pickupID;
      if (!pickupID) {
        return res.status(400).json({ success: false, error: 'Pickup ID is required' });
      }

      const uploadedFile = await StorageService.uploadProofOfPickup(req.file, pickupID);
      
      res.json({ 
        success: true, 
        message: 'Proof of pickup uploaded successfully',
        fileUrl: uploadedFile 
      });
    } catch (error) {
      console.error('Proof upload error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

app.post('/api/protected/upload/profile-picture',
  upload.single('picture'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const uploadedFile = await StorageService.uploadProfilePicture(req.file, req.user.userID);
      
      // Update user profile with new picture URL
      await User.update(req.user.userID, { profilePicture: uploadedFile });
      
      res.json({ 
        success: true, 
        message: 'Profile picture uploaded successfully',
        fileUrl: uploadedFile 
      });
    } catch (error) {
      console.error('Profile picture upload error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Application routes
app.get('/api/protected/applications', async (req, res) => {
  try {
    const applications = await Application.findByUserID(req.user.userID);
    res.json({ success: true, applications });
  } catch (error) {
    console.error('Applications fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/protected/applications', async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      userID: req.user.userID
    };
    
    const application = await Application.create(applicationData);
    res.status(201).json({ 
      success: true, 
      application,
      message: 'Application submitted successfully' 
    });
  } catch (error) {
    console.error('Application creation error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Notifications routes
app.get('/api/protected/notifications', async (req, res) => {
  try {
    const Notification = require('./models/Notification');
    const notifications = await Notification.findByUserID(req.user.userID);
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/protected/notifications/:notificationId/read', async (req, res) => {
  try {
    const Notification = require('./models/Notification');
    const notification = await Notification.findById(req.params.notificationId);
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    if (notification.userID !== req.user.userID) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    await notification.markAsRead();
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notification update error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Points and leaderboard routes
app.get('/api/protected/points', async (req, res) => {
  try {
    const Point = require('./models/Point');
    const userPoints = await Point.findByUserID(req.user.userID);
    const totalPoints = await Point.getTotalPointsByUser(req.user.userID);
    
    res.json({ 
      success: true, 
      points: userPoints, 
      totalPoints,
      user: req.user
    });
  } catch (error) {
    console.error('Points fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/protected/leaderboard', async (req, res) => {
  try {
    const Point = require('./models/Point');
    const { limit = 10 } = req.query;
    const leaderboard = await Point.getLeaderboard(parseInt(limit));
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Leaderboard fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// COLLECTOR ROUTES (Collector access required)
// ============================================================================

app.use('/api/collector', authService.requireCollector.bind(authService));

app.get('/api/collector/available-posts', async (req, res) => {
  try {
    const availablePosts = await Post.findByStatus('Active');
    res.json({ success: true, posts: availablePosts });
  } catch (error) {
    console.error('Available posts fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ADMIN ROUTES (Admin access required)
// ============================================================================

app.use('/api/admin', authService.authenticateUser.bind(authService));
app.use('/api/admin', authService.requireAdmin.bind(authService));

// Add debug logging middleware
app.use('/api/admin', (req, res, next) => {
  next();
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await authService.getAllUsers();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Admin users fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    console.log('Fetching all applications for admin:', req.user?.email);
    
    const Application = require('./models/Application');
    
    // Fetch all applications regardless of status
    const pendingApplications = await Application.findByStatus('Pending');
    const submittedApplications = await Application.findByStatus('Submitted');
    const approvedApplications = await Application.findByStatus('Approved');
    const rejectedApplications = await Application.findByStatus('Rejected');
    
    // Combine all arrays
    const allApplications = [
      ...pendingApplications,
      ...submittedApplications,
      ...approvedApplications,
      ...rejectedApplications
    ];
    
    // Sort by submittedAt date (most recent first)
    allApplications.sort((a, b) => {
      const dateA = new Date(a.reviewedAt || a.submittedAt);
      const dateB = new Date(b.reviewedAt || b.submittedAt);
      return dateB - dateA;
    });
        
    res.json({ success: true, applications: allApplications });
  } catch (error) {
    console.error('Applications fetch error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch applications. Please check server logs.'
    });
  }
});

app.get('/api/admin/applications/pending', async (req, res) => {
  try {   
    // Import Application model if not already imported
    const Application = require('./models/Application');
    
    // Fetch both 'Pending' and 'Submitted' status applications
    const pendingApplications = await Application.findByStatus('Pending');
    const submittedApplications = await Application.findByStatus('Submitted');
    
    // Combine both arrays
    const allApplications = [...pendingApplications, ...submittedApplications];
    
    // Sort by submittedAt date (most recent first)
    allApplications.sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return dateB - dateA;
    });
        
    res.json({ success: true, applications: allApplications });
  } catch (error) {
    console.error('Pending applications fetch error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to fetch applications. Please check server logs.'
    });
  }
});

app.put('/api/admin/applications/:applicationId/review', async (req, res) => {
  try {
    const { status, justification } = req.body;
    const Application = require('./models/Application');
    const application = await Application.findById(req.params.applicationId);
    
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    
    // Update both the application and the user model
    await application.review(req.user.userID, status, justification);
    
    // Fetch the updated application to return current state
    const updatedApplication = await Application.findById(req.params.applicationId);
    
    res.json({ 
      success: true, 
      message: `Application ${status.toLowerCase()} successfully`,
      application: updatedApplication
    });
  } catch (error) {
    console.error('Application review error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/storage-stats', async (req, res) => {
  try {
    const stats = await StorageService.getStorageStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Storage stats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DEVELOPMENT ROUTES (Only available in development)
// ============================================================================

if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEBUG_ROUTES === 'true') {
  app.get('/api/debug/test-firebase', async (req, res) => {
    try {
      const { FirebaseHelper } = require('./config/firebase');
      const result = await FirebaseHelper.testConnection();
      res.json({ success: true, firebaseTest: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/debug/cleanup-temp', async (req, res) => {
    try {
      const result = await StorageService.cleanupTempFiles();
      res.json({ success: true, cleanup: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ============================================================================
// ERROR HANDLING & 404
// ============================================================================

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false, 
        error: 'Too many files. Maximum is 10 files at once.' 
      });
    }
  }
  
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found',
    availableRoutes: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/posts/public',
      'GET /api/protected/profile',
      'POST /api/protected/posts/waste'
    ]
  });
});

// ============================================================================
// SERVER STARTUP & SHUTDOWN
// ============================================================================

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

const { handleMulterError } = require('./services/storage-service');
app.use(handleMulterError);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});

module.exports = app;