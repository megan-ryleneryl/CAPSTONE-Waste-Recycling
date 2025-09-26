// TODO
// Check for userType usage

const express = require('express');
const router = express.Router();
const Post = require('../models/Posts');
const WastePost = require('../models/WastePost');
const InitiativePost = require('../models/InitiativePost');
const ForumPost = require('../models/ForumPost');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const { verifyToken } = require('../middleware/auth');

// ============= READ OPERATIONS =============

// Get all posts (with filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, status, location, userID } = req.query;
    const User = require('../models/Users');
    
    let posts;
    if (userID) {
      posts = await Post.findByUserID(userID);
    } else if (type) {
      posts = await Post.findByType(type);
    } else if (status) {
      posts = await Post.findByStatus(status);
    } else if (location) {
      posts = await Post.findByLocation(location);
    } else {
      posts = await Post.findAll();
    }
    
    // Create a map of user IDs to fetch
    const userIds = [...new Set(posts.map(post => post.userID))];
    
    // Batch fetch all users
    const usersMap = {};
    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (user) {
          usersMap[userId] = {
            userID: user.userID,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: user.profilePictureUrl,
            isOrganization: user.isOrganization,
            organizationName: user.organizationName,
            isCollector: user.isCollector,
            isAdmin: user.isAdmin,
          };
        }
      } catch (err) {
        console.error(`Failed to fetch user ${userId}:`, err.message);
        usersMap[userId] = null;
      }
    }
    
    // Add user data and interaction data to posts
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      const postData = post.toFirestore ? post.toFirestore() : post;
      
      // Get interaction data with error handling
      let likeCount = 0;
      let isLiked = false;
      let commentCount = 0;
      
      try {
        likeCount = await post.getLikeCount();
        isLiked = await post.isLikedByUser(req.user.userID);
        const comments = await post.getComments();
        commentCount = comments.length;
      } catch (err) {
        // Silently handle if these methods don't exist
      }
      
      return {
        ...postData,
        user: usersMap[postData.userID] || {
          firstName: 'Unknown',
          lastName: 'User',
          profilePictureUrl: null
        },
        likeCount,
        isLiked,
        commentCount,
        isOwner: postData.userID === req.user.userID
      };
    }));
    
    res.json({
      success: true,
      posts: enrichedPosts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
});

// Get single post by ID
router.get('/:postId', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Get additional post data
    const likeCount = await post.getLikeCount();
    const isLiked = await post.isLikedByUser(req.user.userID);
    const comments = await post.getComments();
    
    res.json({
      success: true,
      post: {
        ...post,
        likeCount,
        isLiked,
        comments,
        isOwner: post.userID === req.user.userID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
});

// ============= CREATE OPERATIONS =============

// Create new post (unified endpoint)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { postType, ...postData } = req.body;
    const user = req.user;
    
    console.log('Creating post:', { postType, user: user.userID });
    
    // Validate required fields
    if (!postType || !postData.title || !postData.description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: postType, title, and description are required'
      });
    }
    
    let post;
    const basePostData = {
      ...postData,
      userID: user.userID,
      userType: user.userType,
      // TODO
      // isCollector: user.isCollector,
      // isAdmin: user.isAdmin,
      // isOrganization: user.isOrganization
      // Remove userType, but need to update Post schema
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create post based on type
    switch(postType) {
      case 'Waste':
        // FIXED: Ensure materials is an array
        if (typeof postData.materials === 'string') {
          basePostData.materials = postData.materials
            .split(',')
            .map(m => m.trim())
            .filter(m => m.length > 0);
        } else if (Array.isArray(postData.materials)) {
          basePostData.materials = postData.materials.filter(m => m && m.length > 0);
        } else {
          basePostData.materials = [];
        }
        
        // Check if materials array has items
        if (basePostData.materials.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'At least one material must be specified for Waste posts'
          });
        }
        
        // FIXED: Ensure quantity is valid
        basePostData.quantity = parseFloat(postData.quantity) || 1;
        basePostData.price = parseFloat(postData.price) || 0;
        basePostData.unit = postData.unit || 'kg';
        basePostData.condition = postData.condition || 'Good';
        basePostData.pickupDate = postData.pickupDate || null;
        basePostData.pickupTime = postData.pickupTime || null;
        basePostData.status = 'Available'; // Explicitly set status
        
        console.log('Creating WastePost with:', basePostData);
        
        post = await WastePost.create(basePostData);
        
        // Award points for creating waste post
        try {
          const Point = require('../models/Point');
          await Point.create({
            userID: user.userID,
            pointsEarned: 5,
            transaction: 'Post_Creation',
            description: `Created waste post: ${post.title}`
          });
        } catch (pointError) {
          console.error('Point creation error (non-fatal):', pointError);
        }
        break;
        
      case 'Initiative':
        // Only Collectors can create Initiative posts
        if (!user.isCollector && !user.isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Only Collectors can create Initiative posts'
          });
        }
        
        basePostData.goal = postData.goal || '';
        basePostData.targetAmount = parseFloat(postData.targetAmount) || 100;
        basePostData.currentAmount = 0;
        basePostData.endDate = postData.endDate || null;
        basePostData.status = 'Active';
        
        post = await InitiativePost.create(basePostData);
        break;
        
      case 'Forum':
        // Handle tags
        if (typeof postData.tags === 'string') {
          basePostData.tags = postData.tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        } else if (Array.isArray(postData.tags)) {
          basePostData.tags = postData.tags;
        } else {
          basePostData.tags = [];
        }
        
        basePostData.category = postData.category || 'General';
        basePostData.isPinned = false;
        basePostData.isLocked = false;
        basePostData.status = 'Active';
        
        post = await ForumPost.create(basePostData);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid post type. Must be Waste, Initiative, or Forum'
        });
    }
    
    console.log('Post created successfully:', post.postID);
    
    res.status(201).json({
      success: true,
      message: `${postType} post created successfully`,
      post
    });
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
});

// ============= UPDATE OPERATIONS =============

// Update post
router.put('/:postId', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check ownership (only owner or admin can update)
    if (post.userID !== req.user.userID && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this post'
      });
    }
    
    // Prepare update data (exclude fields that shouldn't be updated)
    const { postID, userID, createdAt, postType, ...updateData } = req.body;
    
    // Handle array fields properly
    if (updateData.materials && typeof updateData.materials === 'string') {
      updateData.materials = updateData.materials.split(',').map(m => m.trim());
    }
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim());
    }
    
    const updatedPost = await Post.update(req.params.postId, updateData);
    
    res.json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating post',
      error: error.message
    });
  }
});

// Update post status
router.patch('/:postId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check ownership
    if (post.userID !== req.user.userID && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this post status'
      });
    }
    
    // Validate status based on post type
    const validStatuses = {
      'Waste': ['Available', 'Claimed', 'Completed', 'Cancelled'],
      'Initiative': ['Active', 'Completed', 'Cancelled'],
      'Forum': ['Active', 'Locked', 'Hidden']
    };
    
    if (!validStatuses[post.postType]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status for ${post.postType} post`
      });
    }
    
    const updatedPost = await Post.update(req.params.postId, { status });
    
    res.json({
      success: true,
      message: 'Post status updated successfully',
      post: updatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating post status',
      error: error.message
    });
  }
});

// ============= DELETE OPERATIONS =============

// Delete post
router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check ownership (only owner or admin can delete)
    if (post.userID !== req.user.userID && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post'
      });
    }
    
    // Check if post can be deleted (e.g., not if pickup is in progress)
    if (post.postType === 'Waste' && post.status === 'Claimed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete post with ongoing pickup. Please cancel the pickup first.'
      });
    }
    
    // Delete associated data
    const comments = await post.getComments();
    for (const comment of comments) {
      await comment.delete();
    }
    
    const likes = await post.getLikes();
    for (const like of likes) {
      await like.delete();
    }
    
    // Delete the post
    await Post.delete(req.params.postId);
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
});

// ============= INTERACTION OPERATIONS =============

// Like/Unlike post
router.post('/:postId/like', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if post type supports likes (only Forum posts)
    if (post.postType !== 'Forum') {
      return res.status(400).json({
        success: false,
        message: 'This post type does not support likes'
      });
    }
    
    const existingLike = await Like.findByPostAndUser(req.params.postId, req.user.userID);
    
    if (existingLike) {
      // Unlike
      await existingLike.delete();
      res.json({
        success: true,
        message: 'Post unliked',
        liked: false
      });
    } else {
      // Like
      await Like.create({
        postID: req.params.postId,
        userID: req.user.userID,
        likedAt: new Date()
      });
      res.json({
        success: true,
        message: 'Post liked',
        liked: true
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing like',
      error: error.message
    });
  }
});

// Add comment to post
router.post('/:postId/comment', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if post type supports comments (only Forum posts)
    if (post.postType !== 'Forum') {
      return res.status(400).json({
        success: false,
        message: 'This post type does not support comments'
      });
    }
    
    // Check if post is locked
    if (post.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'This post is locked and cannot receive new comments'
      });
    }
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty'
      });
    }
    
    const comment = await Comment.create({
      postID: req.params.postId,
      userID: req.user.userID,
      content: content.trim(),
      createdAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

// Get comments for a post
router.get('/:postId/comments', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const comments = await post.getComments();
    
    res.json({
      success: true,
      comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
});

// Delete comment
router.delete('/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Check ownership (only owner or admin can delete)
    if (comment.userID !== req.user.userID && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment'
      });
    }
    
    await comment.delete();
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
});

module.exports = router;