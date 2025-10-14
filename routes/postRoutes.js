// TODO
// Check for userType usage

const express = require('express');
const router = express.Router();
const { StorageService, upload, handleMulterError } = require('../services/storage-service');
const Post = require('../models/Posts');
const WastePost = require('../models/WastePost');
const InitiativePost = require('../models/InitiativePost');
const ForumPost = require('../models/ForumPost');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const User = require('../models/Users'); 
const Message = require('../models/Message');  
const Notification = require('../models/Notification');
const Point = require('../models/Point');
const GeocodingService = require('../services/geocodingService');
const { verifyToken } = require('../middleware/auth');

// Apply authentication
router.use(verifyToken);

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
        isOwner: postData.userID === req.user.userID,
        claimedBy: postData.claimedBy || null,
        claimedAt: postData.claimedAt || null,
        supporters: postData.supporters || [],
        supportCount: postData.supportCount || 0
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
    const User = require('../models/Users');
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Get the post data
    const postData = post.toFirestore ? post.toFirestore() : post;
    
    // Fetch user data
    let userData = null;
    try {
      const postUser = await User.findById(postData.userID);
      if (postUser) {
        userData = {
          userID: postUser.userID,
          firstName: postUser.firstName,
          lastName: postUser.lastName,
          profilePictureUrl: postUser.profilePictureUrl,
          isOrganization: postUser.isOrganization,
          organizationName: postUser.organizationName,
          userType: postUser.userType,
          badges: postUser.badges,
          points: postUser.points
        };
      }
    } catch (userError) {
      console.error('Error fetching user:', userError);
      userData = {
        firstName: 'Unknown',
        lastName: 'User',
        profilePictureUrl: null
      };
    }
    
    // Get interactions
    let likeCount = 0;
    let isLiked = false;
    let commentCount = 0;
    
    // ONLY get interaction data for Forum posts
    if (postData.postType === 'Forum') {
      try {
        const likes = await Like.findByPostID(postData.postID);
        likeCount = likes.length;
        isLiked = likes.some(like => like.userID === req.user.userID);
        
        const comments = await Comment.findByPostID(postData.postID);
        commentCount = comments.length;
      } catch (err) {
        console.error('Error fetching interactions:', err);
      }
    }
    
    res.json({
      success: true,
      post: {
        ...postData,
        user: userData,
        likeCount,
        isLiked,
        comments,
        commentCount: comments.length,
        isOwner: postData.userID === req.user.userID,
        claimedBy: postData.claimedBy || null,
        claimedAt: postData.claimedAt || null,
        supporters: postData.supporters || [],
        supportCount: postData.supportCount || 0
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

// Create new post (unified endpoint) - with better multer handling
router.post('/create', verifyToken, (req, res, next) => {
  // Use multer middleware conditionally
  const uploadMiddleware = upload.array('images', 5);
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { postType, ...postData } = req.body;
    const user = req.user;
        
    // Validate required fields
    if (!postType || !postData.title || !postData.description) {
      console.error('Missing fields:', { 
        hasPostType: !!postType, 
        hasTitle: !!postData.title, 
        hasDescription: !!postData.description,
        receivedBody: req.body
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: postType, title, and description are required'
      });
    }
    
    // Handle image uploads
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          const result = await StorageService.saveFile(file, `posts/${postType.toLowerCase()}`);
          imageUrls.push(result.url);
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload images',
          error: uploadError.message
        });
      }
    }

    if (postData.location && typeof postData.location === 'string') {
      try {
        postData.location = JSON.parse(postData.location);
      } catch (e) {
        console.error('Failed to parse location:', e);
      }
    }

    if (postData.location && !postData.location.coordinates?.lat) {
      console.log('🗺️ Geocoding location...');
      const coords = await GeocodingService.getCoordinates(postData.location);
      
      if (coords) {
        postData.location.coordinates = {
          lat: coords.lat,
          lng: coords.lng
        };
        console.log('✅ Coordinates added:', coords);
      } else {
        console.log('⚠️ Geocoding failed, proceeding without coordinates');
      }
    }
    
    let post;
    const basePostData = {
      ...postData,
      userID: user.userID,
      userType: user.userType,
      images: imageUrls,
      isCollector: user.isCollector || false,
      isAdmin: user.isAdmin || false,
      isOrganization: user.isOrganization || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create post based on type
    switch(postType) {
      case 'Waste':
        // Parse materials data - should be JSON string with format [{materialID, quantity}, ...]
        if (typeof postData.materials === 'string') {
          try {
            basePostData.materials = JSON.parse(postData.materials);
          } catch (e) {
            console.error('Failed to parse materials:', e);
            return res.status(400).json({
              success: false,
              message: 'Invalid materials format. Expected JSON array of {materialID, quantity} objects.'
            });
          }
        } else if (Array.isArray(postData.materials)) {
          basePostData.materials = postData.materials;
        }

        // Enrich materials with materialName for efficient display
        if (Array.isArray(basePostData.materials)) {
          const Material = require('../models/Material');
          const enrichedMaterials = [];

          for (const mat of basePostData.materials) {
            // If materialName is already provided, use it
            if (mat.materialName) {
              enrichedMaterials.push(mat);
            } else if (mat.materialID) {
              // Otherwise, look it up from the database
              try {
                const material = await Material.findById(mat.materialID);
                enrichedMaterials.push({
                  materialID: mat.materialID,
                  quantity: mat.quantity,
                  materialName: material ? (material.displayName || material.type) : mat.materialID
                });
              } catch (err) {
                console.error('Error fetching material:', err);
                // Fallback to materialID if lookup fails
                enrichedMaterials.push({
                  materialID: mat.materialID,
                  quantity: mat.quantity,
                  materialName: mat.materialID
                });
              }
            }
          }

          basePostData.materials = enrichedMaterials;
        }

        basePostData.price = parseFloat(postData.price) || 0;
        basePostData.pickupDate = postData.pickupDate || null;
        basePostData.pickupTime = postData.pickupTime || null;
        basePostData.status = 'Active';

        post = await WastePost.create(basePostData);
        
        try {
          await Point.create({
            userID: user.userID,
            pointType: 'Post_Creation',
            points: 10,
            description: `Created waste post: ${post.title}`
          });
        } catch (pointError) {
          console.error('Point creation error (non-fatal):', pointError);
        }
        break;
        
      case 'Initiative':
        if (!user.isCollector) {
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
      'Waste': ['Active', 'Claimed', 'Completed', 'Cancelled'],
      'Initiative': ['Active', 'Completed', 'Cancelled'],
      'Forum': ['Active', 'Cancelled']
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
    
    let liked = false;
    let likeCount = 0;
    
    if (existingLike) {
      // Unlike
      await existingLike.delete();
      liked = false;
    } else {
      // Like
      await Like.create({
        postID: req.params.postId,
        userID: req.user.userID,
        createdAt: new Date()
      });
      liked = true;
    }
    
    // Get updated like count
    const allLikes = await Like.findByPostID(req.params.postId);
    likeCount = allLikes.length;
        
    res.json({
      success: true,
      message: liked ? 'Post liked' : 'Post unliked',
      liked: liked,
      likeCount: likeCount
    });
  } catch (error) {
    console.error('Error processing like:', error);
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
    
    // Get updated comment count
    const allComments = await Comment.findByPostID(req.params.postId);
    const commentCount = allComments.length;
        
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: comment,
      commentCount: commentCount
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

// Get comments for a post (WITH USER DATA) - FIXED VERSION
router.get('/:postId/comments', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      console.log('Post not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const comments = await post.getComments();
    
    // Fetch user data for all comments in one batch
    const userIds = [...new Set(comments.map(c => c.userID))];
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
            organizationName: user.organizationName
          };
        }
      } catch (err) {
        console.error(`Failed to fetch user ${userId}:`, err);
        usersMap[userId] = {
          firstName: 'Unknown',
          lastName: 'User',
          profilePictureUrl: null
        };
      }
    }
    
    // Attach user data to comments and serialize properly
    const commentsWithUsers = comments.map(comment => {
      // Handle Firestore Timestamp conversion
      let createdAt = comment.createdAt;
      if (createdAt && createdAt.toDate) {
        createdAt = createdAt.toDate().toISOString();
      } else if (createdAt instanceof Date) {
        createdAt = createdAt.toISOString();
      }
      
      return {
        commentID: comment.commentID,
        postID: comment.postID,
        userID: comment.userID,
        content: comment.content,
        createdAt: createdAt,
        user: usersMap[comment.userID] || {
          firstName: 'Unknown',
          lastName: 'User',
          profilePictureUrl: null
        }
      };
    });
    res.json({
      success: true,
      comments: commentsWithUsers
    });
  } catch (error) {
    console.error('FULL ERROR:', error);
    console.error('ERROR STACK:', error.stack);
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


// Module 2 Integration: Claim and Support Actions
// These trigger the pickup management flow

// Claim a Waste Post (Collectors only)
router.post('/:postId/claim', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const collectorID = req.user.userID;
    
    // Import required models at the beginning of the handler
    const User = require('../models/Users');
    const Message = require('../models/Message');
    const Notification = require('../models/Notification');
    
    // Get the post
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    // Check if it's a Waste post
    if (post.postType !== 'Waste') {
      return res.status(400).json({
        success: false,
        message: 'Only Waste posts can be claimed'
      });
    }
    
    // Check if user is a collector (using isCollector boolean)
    if (!req.user.isCollector && !req.user.isAdmin) {
      console.log('User is not a collector:', req.user);
      return res.status(403).json({
        success: false,
        message: 'Only collectors can claim waste posts. Please apply for collector privileges in your profile.'
      });
    }
    
    // Check if the collector is not the post owner
    if (post.userID === collectorID) {
      return res.status(400).json({
        success: false,
        message: 'You cannot claim your own post'
      });
    }
    
    // Check if post is already claimed
    if (post.status === 'Claimed' || post.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `This post has already been ${post.status.toLowerCase()}.`
      });
    }
    
    // Update post status to Claimed
    const updateData = { 
      status: 'Claimed',
      claimedBy: collectorID,
      claimedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
        
    await Post.update(postId, updateData);
    
    // Get collector's and giver's names for the messages
    const collector = await User.findById(collectorID);

    if (!collector) {
      throw new Error(`Collector with ID ${collectorID} not found`);
    }

    const giver = await User.findById(post.userID);

    if (!giver) {
      throw new Error(`Giver with ID ${post.userID} not found`);
    }

    const collectorName = `${collector.firstName} ${collector.lastName}`;
    const giverName = `${giver.firstName} ${giver.lastName}`;

    // Create initial message for coordination
    const newMessage = await Message.create({
      senderID: collectorID,
      senderName: collectorName,
      receiverID: post.userID,
      receiverName: giverName,
      postID: postId,
      postTitle: post.title,
      postType: post.postType || 'Waste',
      messageType: 'claim',
      message: `Hi! I'm interested in collecting your ${post.title}. Let's coordinate the pickup details.`,
      isRead: false,
      isDeleted: false,
      sentAt: new Date(),
      metadata: {
        action: 'post_claimed',
        postTitle: post.title,
        collectorName: collectorName
      }
    });

    // Send guidance message to collector to propose pickup schedule
    await Message.create({
      senderID: collectorID,
      senderName: collectorName,
      receiverID: post.userID,
      receiverName: giverName,
      postID: postId,
      postTitle: post.title,
      postType: post.postType || 'Waste',
      messageType: 'system',
      message: `[Guide] To complete the pickup process, please propose a pickup schedule by clicking the 'Schedule Pickup' button above.`,
      isRead: false,
      isDeleted: false,
      sentAt: new Date(),
      metadata: {
        action: 'guidance',
        guidanceFor: 'collector',
        nextStep: 'schedule_pickup'
      }
    });

    // Send notification to post owner
    await Notification.create({
      userID: post.userID,
      type: 'Pickup',
      title: 'Your post has been claimed!',
      message: `${collectorName} wants to collect your "${post.title}"`,
      referenceID: postId,
      referenceType: 'post',
      actionURL: `/chat?postId=${postId}&userId=${collectorID}`,
      priority: 'high',
      metadata: {
        collectorID: collectorID,
        collectorName: collectorName,
        postID: postId
      }
    });
    
    res.json({
      success: true,
      message: 'Post claimed successfully! You can now chat with the giver to arrange pickup.',
      data: {
        postID: postId,
        chatURL: `/chat?postId=${postId}&userId=${post.userID}`,
        messageID: newMessage.messageID
      }
    });
    
  } catch (error) {
    console.error('Error claiming post:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to claim post. Please try again.'
    });
  }
});

router.get('/:postId/claim-status', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const claimed = post.status === 'Claimed' || post.status === 'Completed';
    let claimDetails = null;
    
    if (claimed && post.claimedBy) {
      const collector = await User.findById(post.claimedBy);
      if (collector) {
        claimDetails = {
          collectorID: collector.userID,
          collectorName: `${collector.firstName} ${collector.lastName}`,
          claimedAt: post.claimedAt
        };
      }
    }
    
    res.json({
      success: true,
      claimed: claimed,
      claimDetails: claimDetails,
      postStatus: post.status
    });
    
  } catch (error) {
    console.error('Error checking claim status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check claim status'
    });
  }
});


// Support an Initiative Post (Givers only)
router.post('/:postID/support', verifyToken, async (req, res) => {
  try {
    const { postID } = req.params;
    const giverID = req.user.userID;
    const { materials, quantity, notes } = req.body;
    
    // No need to check for specific user type for supporting initiatives
    // Any user can support an initiative
    
    const Post = require('../models/Posts');
    const post = await Post.findById(postID);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    if (post.postType !== 'Initiative') {
      return res.status(400).json({
        success: false,
        message: 'Can only support Initiative posts'
      });
    }
    
    if (post.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Initiative is not active'
      });
    }
    
    // Create support message
    const Message = require('../models/Message');
    await Message.create({
      senderID: giverID,
      receiverID: post.userID,
      postID: postID,
      messageType: 'support',
      message: `I'd like to support your initiative "${post.title}" with ${quantity} ${materials}. ${notes || ''}`,
      metadata: {
        action: 'initiative_support',
        postTitle: post.title,
        materials,
        quantity,
        notes
      }
    });
    
    // Send notification to initiative owner
    const Notification = require('../models/Notification');
    const supporterName = `${req.user.firstName} ${req.user.lastName}`;
    
    await Notification.create({
      userID: post.userID,
      type: Notification.TYPES.INITIATIVE_SUPPORT,
      title: 'New support for your initiative!',
      message: `${supporterName} wants to support "${post.title}"`,
      referenceID: postID,
      referenceType: 'post',
      actionURL: `/chat/${postID}/${giverID}`,
      priority: 'high'
    });
    
    res.json({
      success: true,
      message: 'Support request sent. The initiative owner will review and respond.',
      data: {
        postID: postID,
        chatURL: `/chat/${postID}/${post.userID}`
      }
    });
    
  } catch (error) {
    console.error('Error supporting initiative:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to support initiative'
    });
  }
});



module.exports = router;