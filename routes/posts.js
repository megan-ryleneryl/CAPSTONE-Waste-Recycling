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
const User = require('../models/Users');  // CRITICAL FIX
const Message = require('../models/Message');  
const Notification = require('../models/Notification');
const Point = require('../models/Point');
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

            // Debug log to check what fields are present
      console.log('Post data for', postData.postID, ':', {
        hasClaimedBy: 'claimedBy' in postData,
        claimedBy: postData.claimedBy,
        status: postData.status,
        supporters: postData.supporters
      });
      
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
      console.log('Fetched user data for post:', userData);
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
    let comments = [];
    
    try {
      likeCount = await post.getLikeCount();
      isLiked = await post.isLikedByUser(req.user.userID);
      comments = await post.getComments();
    } catch (err) {
      console.error('Error fetching interactions:', err);
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
        basePostData.status = 'Active'; // Explicitly set status
        
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
    
    console.log('Claim attempt by user:', {
      userID: collectorID,
      isCollector: req.user.isCollector,
      isAdmin: req.user.isAdmin
    });
    
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
    
    console.log('Updating post with data:', JSON.stringify(updateData, null, 2));
    
    await Post.update(postId, updateData);
    
    // Get collector's name for the message
    const collector = await User.findById(collectorID);
    
    if (!collector) {
      throw new Error(`Collector with ID ${collectorID} not found`);
    }
    
    const collectorName = `${collector.firstName} ${collector.lastName}`;
    
    // Create initial message for coordination
    const newMessage = await Message.create({
      senderID: collectorID,
      receiverID: post.userID,
      postID: postId,
      messageType: 'claim',
      message: `Hi! I'm interested in collecting your ${post.title}. Let's coordinate the pickup details.`,
      metadata: {
        action: 'post_claimed',
        postTitle: post.title,
        collectorName: collectorName
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
    
    console.log('Post claimed successfully:', {
      postID: postId,
      collectorID: collectorID,
      status: 'Claimed'
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