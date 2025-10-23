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

// CACHE for posts (5 minute TTL)
const postsCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Helper to invalidate cache
function invalidatePostsCache() {
  postsCache.data = null;
  postsCache.timestamp = 0;
  console.log('🗑️ Posts cache invalidated');
}

// Get all posts (with filters) - OPTIMIZED
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, status, location, userID, skipInteractions } = req.query;
    const User = require('../models/Users');

    // Check cache first (only for non-filtered requests)
    const now = Date.now();
    const useCache = !type && !status && !location && !userID;

    if (useCache && postsCache.data && (now - postsCache.timestamp) < postsCache.ttl) {
      console.log('📦 Using cached posts data');
      return res.json({
        success: true,
        posts: postsCache.data,
        cached: true
      });
    }

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

    // Filter out inactive posts (posts from deleted users)
    posts = posts.filter(post => post.status !== 'Inactive');

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

    // OPTIMIZED: Only fetch interactions for Forum posts (where likes/comments are shown)
    // This dramatically reduces reads while keeping Forum posts interactive
    const shouldFetchInteractions = skipInteractions !== 'true';

    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      const postData = post.toFirestore ? post.toFirestore() : post;

      // Default values
      let likeCount = 0;
      let isLiked = false;
      let commentCount = 0;

      // OPTIMIZED: Only fetch interactions for Forum posts (not Waste/Initiative)
      // Forum posts need likes/comments, but Waste/Initiative posts don't display them
      if (shouldFetchInteractions && postData.postType === 'Forum') {
        try {
          likeCount = await post.getLikeCount();
          isLiked = await post.isLikedByUser(req.user.userID);
          const comments = await post.getComments();
          commentCount = comments.length;
        } catch (err) {
          console.error(`Error fetching interactions for post ${postData.postID}:`, err.message);
        }
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

    // Cache the result (only for non-filtered, with interactions)
    if (useCache && shouldFetchInteractions) {
      postsCache.data = enrichedPosts;
      postsCache.timestamp = now;
      console.log('💾 Cached posts data');
    }

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

    // Check if post is inactive (from deleted user)
    if (post.status === 'Inactive') {
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
  console.log('🔴🔴🔴 CREATE POST ENDPOINT HIT 🔴🔴🔴');
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

    // DEBUG: Log ALL received data
    console.log('🚀 POST CREATE - Received request');
    console.log('📋 Post Type:', postType);
    console.log('📋 Full postData keys:', Object.keys(postData));
    console.log('📦 Materials in postData:', postData.materials);
    console.log('📦 Materials type:', typeof postData.materials);

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
            transaction: 'Post_Creation',
            pointsEarned: 10,
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

        // DEBUG: Log received materials data
        console.log('📦 Received materials data:', postData.materials);
        console.log('📦 Materials type:', typeof postData.materials);

        // Parse materials data - similar to waste post format
        if (typeof postData.materials === 'string') {
          try {
            basePostData.materials = JSON.parse(postData.materials);
            console.log('📦 Parsed materials from string:', basePostData.materials);
          } catch (e) {
            console.error('Failed to parse materials:', e);
            return res.status(400).json({
              success: false,
              message: 'Invalid materials format. Expected JSON array of {materialID, targetQuantity} objects.'
            });
          }
        } else if (Array.isArray(postData.materials)) {
          basePostData.materials = postData.materials;
          console.log('📦 Materials already array:', basePostData.materials);
        } else {
          console.log('⚠️ No materials provided or invalid format');
        }

        // Enrich materials with materialName and initialize currentQuantity
        if (Array.isArray(basePostData.materials)) {
          const Material = require('../models/Material');
          const enrichedMaterials = [];

          for (const mat of basePostData.materials) {
            // Map quantity to targetQuantity (frontend uses 'quantity', backend expects 'targetQuantity')
            const targetQty = mat.targetQuantity || mat.quantity;

            if (!targetQty || parseFloat(targetQty) <= 0) {
              console.error('Invalid target quantity for material:', mat);
              continue; // Skip materials with invalid quantities
            }

            // If materialName is already provided, use it
            if (mat.materialName) {
              enrichedMaterials.push({
                materialID: mat.materialID,
                targetQuantity: parseFloat(targetQty),
                currentQuantity: 0,
                materialName: mat.materialName
              });
            } else if (mat.materialID) {
              // Otherwise, look it up from the database
              try {
                const material = await Material.findById(mat.materialID);
                enrichedMaterials.push({
                  materialID: mat.materialID,
                  targetQuantity: parseFloat(targetQty),
                  currentQuantity: 0,
                  materialName: material ? (material.displayName || material.type) : mat.materialID
                });
              } catch (err) {
                console.error('Error fetching material:', err);
                // Fallback to materialID if lookup fails
                enrichedMaterials.push({
                  materialID: mat.materialID,
                  targetQuantity: parseFloat(targetQty),
                  currentQuantity: 0,
                  materialName: mat.materialID
                });
              }
            }
          }

          basePostData.materials = enrichedMaterials;
          console.log('✅ Enriched materials:', enrichedMaterials);
        }

        // For backward compatibility: if no materials array, use targetAmount
        basePostData.targetAmount = parseFloat(postData.targetAmount) ||
          (Array.isArray(basePostData.materials)
            ? basePostData.materials.reduce((sum, m) => sum + (parseFloat(m.targetQuantity) || 0), 0)
            : 100);

        basePostData.currentAmount = 0;
        basePostData.endDate = postData.endDate || null;
        basePostData.status = 'Active';

        console.log('🔥 Final basePostData before create:', {
          materials: basePostData.materials,
          targetAmount: basePostData.targetAmount
        });

        post = await InitiativePost.create(basePostData);
        console.log('✅ Initiative post created:', post.postID);
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
        
    // Invalidate cache when new post is created
    invalidatePostsCache();

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
    
    // Invalidate cache when post is updated
    invalidatePostsCache();

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
    
    // Invalidate cache when status is updated
    invalidatePostsCache();

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
    
    // Invalidate cache when post is deleted
    invalidatePostsCache();

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


// Support an Initiative Post (Givers only) - UPDATED for multi-material support
router.post('/:postID/support', verifyToken, async (req, res) => {
  try {
    const { postID } = req.params;
    const giverID = req.user.userID;
    const { offeredMaterials, notes } = req.body;

    // No need to check for specific user type for supporting initiatives
    // Any user can support an initiative

    const Post = require('../models/Posts');
    const InitiativePost = require('../models/InitiativePost');
    const Support = require('../models/Support');
    const User = require('../models/Users');
    const Material = require('../models/Material');
    const Message = require('../models/Message');
    const Notification = require('../models/Notification');

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

    // Check if user is trying to support their own initiative
    if (post.userID === giverID) {
      return res.status(400).json({
        success: false,
        message: 'You cannot support your own initiative'
      });
    }

    // Check if user already has a pending or accepted support for this initiative
    const existingSupports = await Support.findByInitiative(postID);
    const userExistingSupport = existingSupports.find(s =>
      s.giverID === giverID &&
      ['Pending', 'Accepted', 'PartiallyAccepted', 'PickupScheduled'].includes(s.status)
    );

    if (userExistingSupport) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active support request for this initiative. Please wait for the initiative owner to review your current request.',
        existingSupportID: userExistingSupport.supportID
      });
    }

    // Validate offeredMaterials
    if (!offeredMaterials || !Array.isArray(offeredMaterials) || offeredMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one offered material is required'
      });
    }

    // Validate each offered material
    for (const mat of offeredMaterials) {
      if (!mat.materialID) {
        return res.status(400).json({
          success: false,
          message: 'Each material must have a materialID'
        });
      }
      if (!mat.materialName) {
        return res.status(400).json({
          success: false,
          message: 'Each material must have a materialName'
        });
      }
      if (!mat.quantity || parseFloat(mat.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: `Quantity must be greater than 0 for ${mat.materialName || mat.materialID}`
        });
      }

      // Validate material against initiative's materials
      if (post.materials && Array.isArray(post.materials) && post.materials.length > 0) {
        const requestedMaterial = post.materials.find(m => m.materialID === mat.materialID);

        if (!requestedMaterial) {
          return res.status(400).json({
            success: false,
            message: `${mat.materialName} is not part of this initiative's needs`
          });
        }

        // Check if target already reached for this specific material
        if (requestedMaterial.currentQuantity >= requestedMaterial.targetQuantity) {
          return res.status(400).json({
            success: false,
            message: `This initiative has already reached its target for ${mat.materialName}`
          });
        }
      }
    }

    // Get user names
    const giver = await User.findById(giverID);
    const collector = await User.findById(post.userID);

    if (!giver || !collector) {
      throw new Error('User data not found');
    }

    const giverName = `${giver.firstName} ${giver.lastName}`;
    const collectorName = `${collector.firstName} ${collector.lastName}`;

    // Create Support record
    const supportData = {
      initiativeID: postID,
      initiativeTitle: post.title,
      giverID: giverID,
      giverName: giverName,
      collectorID: post.userID,
      collectorName: collectorName,
      offeredMaterials: offeredMaterials,
      notes: notes || '',
      estimatedValue: offeredMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0),
      status: 'Pending'
    };

    const support = await Support.create(supportData);

    // Add supporter to initiative (only if not already a supporter)
    const initiative = new InitiativePost(post);
    await initiative.addSupporter(giverID);

    // Create support message
    const materialsText = offeredMaterials.map(m =>
      `${m.quantity} ${m.unit || 'kg'} of ${m.materialName}`
    ).join(', ');
    const messageText = `I'd like to support your initiative "${post.title}" with ${materialsText}. ${notes || ''}`;
    const notificationMessage = `${giverName} wants to support "${post.title}" with ${materialsText}`;

    await Message.create({
      senderID: giverID,
      senderName: giverName,
      receiverID: post.userID,
      receiverName: collectorName,
      postID: postID,
      postTitle: post.title,
      postType: 'Initiative',
      messageType: 'support',
      message: messageText,
      metadata: {
        action: 'initiative_support',
        supportID: support.supportID,
        postTitle: post.title,
        notes: notes || '',
        offeredMaterials: offeredMaterials
      }
    });

    // Send notification to initiative owner
    await Notification.create({
      userID: post.userID,
      type: Notification.TYPES.INITIATIVE_SUPPORT,
      title: 'New support for your initiative!',
      message: notificationMessage,
      referenceID: postID,
      referenceType: 'post',
      actionURL: `/chat?postId=${postID}&userId=${giverID}`,
      priority: 'high',
      metadata: {
        supportID: support.supportID,
        giverID: giverID,
        giverName: giverName,
        offeredMaterials: offeredMaterials
      }
    });

    res.json({
      success: true,
      message: 'Support request sent. The initiative owner will review and respond.',
      data: {
        supportID: support.supportID,
        postID: postID,
        chatURL: `/chat?postId=${postID}&userId=${post.userID}`
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

// Accept specific material in a support request (NEW)
router.post('/support/:supportID/accept-material', verifyToken, async (req, res) => {
  try {
    const { supportID } = req.params;
    const { materialID } = req.body;
    const collectorID = req.user.userID;

    if (!materialID) {
      return res.status(400).json({
        success: false,
        message: 'Material ID is required'
      });
    }

    const Support = require('../models/Support');
    const support = await Support.findById(supportID);

    if (!support) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Verify the user is the initiative owner
    if (support.collectorID !== collectorID) {
      return res.status(403).json({
        success: false,
        message: 'Only the initiative owner can accept support requests'
      });
    }

    // Accept the specific material
    await support.acceptMaterial(collectorID, materialID);

    res.json({
      success: true,
      message: 'Material accepted!',
      data: {
        supportID: support.supportID,
        status: support.status,
        offeredMaterials: support.offeredMaterials
      }
    });

  } catch (error) {
    console.error('Error accepting material:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept material'
    });
  }
});

// Accept ALL materials in a support request (backward compatible)
router.post('/support/:supportID/accept', verifyToken, async (req, res) => {
  try {
    const { supportID } = req.params;
    const collectorID = req.user.userID;

    const Support = require('../models/Support');
    const support = await Support.findById(supportID);

    if (!support) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Verify the user is the initiative owner
    if (support.collectorID !== collectorID) {
      return res.status(403).json({
        success: false,
        message: 'Only the initiative owner can accept support requests'
      });
    }

    // Accept the support (all materials)
    await support.accept(collectorID);

    res.json({
      success: true,
      message: 'Support request accepted! You can now coordinate pickup details.',
      data: {
        supportID: support.supportID,
        status: support.status,
        chatURL: `/chat?postId=${support.initiativeID}&userId=${support.giverID}`
      }
    });

  } catch (error) {
    console.error('Error accepting support:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept support request'
    });
  }
});

// Decline specific material in a support request (NEW)
router.post('/support/:supportID/decline-material', verifyToken, async (req, res) => {
  try {
    const { supportID } = req.params;
    const { materialID, reason } = req.body;
    const collectorID = req.user.userID;

    if (!materialID) {
      return res.status(400).json({
        success: false,
        message: 'Material ID is required'
      });
    }

    const Support = require('../models/Support');
    const support = await Support.findById(supportID);

    if (!support) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Verify the user is the initiative owner
    if (support.collectorID !== collectorID) {
      return res.status(403).json({
        success: false,
        message: 'Only the initiative owner can decline support requests'
      });
    }

    // Decline the specific material
    await support.declineMaterial(collectorID, materialID, reason);

    res.json({
      success: true,
      message: 'Material declined',
      data: {
        supportID: support.supportID,
        status: support.status,
        offeredMaterials: support.offeredMaterials
      }
    });

  } catch (error) {
    console.error('Error declining material:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to decline material'
    });
  }
});

// Decline ALL materials in a support request (backward compatible)
router.post('/support/:supportID/decline', verifyToken, async (req, res) => {
  try {
    const { supportID } = req.params;
    const { reason } = req.body;
    const collectorID = req.user.userID;

    const Support = require('../models/Support');
    const support = await Support.findById(supportID);

    if (!support) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Verify the user is the initiative owner
    if (support.collectorID !== collectorID) {
      return res.status(403).json({
        success: false,
        message: 'Only the initiative owner can decline support requests'
      });
    }

    // Decline the support (all materials)
    await support.decline(collectorID, reason);

    res.json({
      success: true,
      message: 'Support request declined',
      data: {
        supportID: support.supportID,
        status: support.status
      }
    });

  } catch (error) {
    console.error('Error declining support:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to decline support request'
    });
  }
});

// Get all support requests for an initiative
router.get('/:postID/supports', verifyToken, async (req, res) => {
  try {
    const { postID } = req.params;
    const { status } = req.query;

    const Post = require('../models/Posts');
    const Support = require('../models/Support');

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
        message: 'Only Initiative posts have support requests'
      });
    }

    // Get support requests based on status filter
    let supports;
    if (status === 'pending') {
      supports = await Support.getPendingForInitiative(postID);
    } else if (status === 'accepted') {
      supports = await Support.getAcceptedForInitiative(postID);
    } else if (status === 'active') {
      // Get all active supports (pending, accepted, partially accepted, or pickup scheduled)
      const allSupports = await Support.findByInitiative(postID);
      supports = allSupports.filter(s =>
        ['Pending', 'Accepted', 'PartiallyAccepted', 'PickupScheduled'].includes(s.status)
      );
    } else {
      supports = await Support.findByInitiative(postID);
    }

    res.json({
      success: true,
      supports: supports.map(s => s.toFirestore())
    });

  } catch (error) {
    console.error('Error fetching supports:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch support requests'
    });
  }
});

// Get user's support history (as giver or collector)
router.get('/supports/my-supports', verifyToken, async (req, res) => {
  try {
    const userID = req.user.userID;
    const { role } = req.query; // 'giver', 'collector', or 'both'

    const Support = require('../models/Support');
    const supports = await Support.findByUser(userID, role || 'both');

    res.json({
      success: true,
      supports: supports.map(s => s.toFirestore())
    });

  } catch (error) {
    console.error('Error fetching user supports:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch support history'
    });
  }
});

// Cancel a support request
router.post('/support/:supportID/cancel', verifyToken, async (req, res) => {
  try {
    const { supportID } = req.params;
    const { reason } = req.body;
    const userID = req.user.userID;

    const Support = require('../models/Support');
    const support = await Support.findById(supportID);

    if (!support) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Verify the user is either the giver or collector
    if (support.giverID !== userID && support.collectorID !== userID) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this support request'
      });
    }

    // Cancel the support
    await support.cancel(userID, reason);

    res.json({
      success: true,
      message: 'Support request cancelled',
      data: {
        supportID: support.supportID,
        status: support.status
      }
    });

  } catch (error) {
    console.error('Error cancelling support:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel support request'
    });
  }
});

// Complete a support request (when pickup is completed)
router.post('/support/:supportID/complete', verifyToken, async (req, res) => {
  try {
    const { supportID } = req.params;
    const { completionNotes, actualMaterials } = req.body;
    const userID = req.user.userID;

    const Support = require('../models/Support');
    const support = await Support.findById(supportID);

    if (!support) {
      return res.status(404).json({
        success: false,
        message: 'Support request not found'
      });
    }

    // Verify the user is either the giver or collector
    if (support.giverID !== userID && support.collectorID !== userID) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this support request'
      });
    }

    // Complete the support (this also updates initiative progress)
    await support.complete({
      completionNotes: completionNotes || '',
      actualMaterials: actualMaterials || []
    });

    res.json({
      success: true,
      message: 'Support request completed successfully',
      data: {
        supportID: support.supportID,
        status: support.status,
        completedAt: support.completedAt
      }
    });

  } catch (error) {
    console.error('Error completing support:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete support request'
    });
  }
});



module.exports = router;