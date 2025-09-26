// TODO
// Check for userType usage

const Post = require('./Posts');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class ForumPost extends Post {
  constructor(data = {}) {
    super(data);
    
    // Ensure this is a Forum post
    this.postType = 'Forum';
    
    // Forum-specific fields - STORE DIRECTLY
    this.category = data.category || 'General';
    this.tags = data.tags || [];
    this.isPinned = data.isPinned || false;
    this.isLocked = data.isLocked || false;
    
    // Add userType if provided
    this.userType = data.userType || '';
  }

  // Override validation
  validate() {
    const errors = [];
    
    // Base validation
    if (!this.userID) errors.push('User ID is required');
    if (!this.title) errors.push('Title is required');
    if (!this.description) errors.push('Description is required');
    if (!this.location) errors.push('Location is required');
    
    // Forum-specific validation
    if (!['General', 'Tips', 'News', 'Questions'].includes(this.category)) {
      errors.push('Valid category is required for forum posts');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore - Return flat structure
  toFirestore() {
    return {
      postID: this.postID,
      userID: this.userID,
      userType: this.userType,
      postType: this.postType,
      title: this.title,
      description: this.description,
      location: this.location,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Forum-specific fields at root level
      category: this.category,
      tags: this.tags,
      isPinned: this.isPinned,
      isLocked: this.isLocked
    };
  }

  // Static method to create a ForumPost
  static async create(forumPostData) {
    const db = getFirestore();
    const forumPost = new ForumPost(forumPostData);
    
    const validation = forumPost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const postRef = doc(db, 'posts', forumPost.postID);
      await setDoc(postRef, forumPost.toFirestore());
      console.log('ForumPost created successfully:', forumPost.postID);
      return forumPost;
    } catch (error) {
      console.error('Firestore error:', error);
      throw new Error(`Failed to create forum post: ${error.message}`);
    }
  }
}

module.exports = ForumPost;