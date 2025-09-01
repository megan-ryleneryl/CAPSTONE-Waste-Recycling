// server.js - Express server setup with local file storage
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import services
const authService = require('./services/authService');
const { StorageService, upload, serveUploads } = require('./services/storageService');
const notificationService = require('./services/notificationService');

// Import models
const User = require('./models/User');
const Post = require('./models/Post');
const WastePost = require('./models/WastePost');
const Application = require('./models/Application');
const Pickup = require('./models/Pickup');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Serve uploaded files statically
app.use('/uploads', serveUploads, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

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
        userType: result.firestoreUser.userType
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Protected routes (require authentication)
app.use('/api/protected', authService.authenticateUser.bind(authService));

// User routes
app.get('/api/protected/profile', async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/protected/profile', async (req, res) => {
  try {
    const updatedUser = await User.update(req.user.userID, req.body);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
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
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Post routes
app.get('/api/protected/posts', async (req, res) => {
  try {
    const { type, status, location } = req.query;
    
    let posts;
    if (type) {
      posts = await Post.findByType(type);
    } else if (status) {
      posts = await Post.findByStatus(status);
    } else if (location) {
      posts = await Post.findByLocation(location);
    } else {
      // You might want to implement a general "get all posts" method
      posts = await Post.findByType('Waste'); // Default to waste posts
    }
    
    res.json({ success: true, posts });
  } catch (error) {
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
    res.status(201).json({ success: true, post: wastePost });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Admin routes
app.use('/api/admin', authService.requireAdmin.bind(authService));

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await authService.getAllUsers();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/storage-stats', async (req, res) => {
  try {
    const stats = await StorageService.getStorageStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
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
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Recycling Platform API running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗂️  File uploads: Local storage (${path.join(__dirname, 'uploads')})`);
  
  // Clean up temp files on startup
  StorageService.cleanupTempFiles().then(result => {
    console.log(`🧹 ${result.message}`);
  });
});

module.exports = app;