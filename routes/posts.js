// Note from Megan: This is copy-pasted code, it's just here as a placeholder. 
// Feel free to delete or change completely.

const express = require('express');
const router = express.Router();
const Post = require('../models/Posts');
const WastePost = require('../models/WastePost');
const { verifyToken } = require('../middleware/auth');

// Get all posts
router.get('/', verifyToken, async (req, res) => {
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
      // Get all posts
      posts = await Post.findAll();
    }
    
    res.json({
      success: true,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
});

// Create new post
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { postType, ...postData } = req.body;
    const user = req.user;
    
    let post;
    if (postType === 'Waste') {
      post = await WastePost.create({
        ...postData,
        userID: user.userID,
        userType: user.userType,
        status: 'Available'
      });
    } else {
      post = await Post.create({
        ...postData,
        postType,
        userID: user.userID,
        userType: user.userType,
        status: 'Active'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
});

module.exports = router;