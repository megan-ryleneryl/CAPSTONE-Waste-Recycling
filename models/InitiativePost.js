const Post = require('./Posts');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class InitiativePost extends Post {
  constructor(data = {}) {
    super(data);
    
    // Ensure this is an Initiative post
    this.postType = 'Initiative';
    
    // Initiative-specific fields
    this.goal = data.goal || '';
    this.targetAmount = data.targetAmount || 0;
    this.currentAmount = data.currentAmount || 0;
    this.endDate = data.endDate || null;
    
    // IMPORTANT: Explicitly set support tracking fields
    this.supporters = data.supporters || [];
    this.supportCount = data.supportCount || 0;
  }

  // Override validation
  validate() {
    const errors = [];
    
    // Base validation
    if (!this.userID) errors.push('User ID is required');
    if (!this.title) errors.push('Title is required');
    if (!this.description) errors.push('Description is required');
    if (!this.location) errors.push('Location is required');
    
    // Initiative-specific validation
    if (!this.goal) errors.push('Initiative goal is required');
    if (this.targetAmount <= 0) errors.push('Target amount must be greater than 0');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore - MUST INCLUDE ALL FIELDS
  toFirestore() {
    return {
      postID: this.postID,
      userID: this.userID,
      postType: this.postType,
      title: this.title,
      description: this.description,
      location: this.location,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      images: this.images || [],
      // Initiative-specific fields
      goal: this.goal,
      targetAmount: this.targetAmount,
      currentAmount: this.currentAmount,
      endDate: this.endDate,
      // CRITICAL: Include support tracking fields
      supporters: this.supporters,
      supportCount: this.supportCount,
      // ADD THESE THREE LINES:
      // User flags
      isCollector: this.isCollector,
      isAdmin: this.isAdmin,
      isOrganization: this.isOrganization
    };
  }

  // Static method to create an InitiativePost
  static async create(initiativePostData) {
    const db = getFirestore();
    const initiativePost = new InitiativePost(initiativePostData);
    
    const validation = initiativePost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const postRef = doc(db, 'posts', initiativePost.postID);
      await setDoc(postRef, initiativePost.toFirestore());
      console.log('InitiativePost created successfully:', initiativePost.postID);
      return initiativePost;
    } catch (error) {
      console.error('Firestore error:', error);
      throw new Error(`Failed to create initiative post: ${error.message}`);
    }
  }
}

module.exports = InitiativePost;