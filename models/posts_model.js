// Post.js - Firestore Post Model (Base class for all post types)
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Post {
  constructor(data = {}) {
    this.postID = data.postID || uuidv4();
    this.userID = data.userID || '';
    this.postType = data.postType || ''; // Waste, Initiative, Forum
    this.title = data.title || '';
    this.description = data.description || '';
    this.location = data.location || null;
    this.status = data.status || 'Active'; // Active, Waiting, Scheduled, Collected, Inactive
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // Type-specific fields (will be populated by subclasses)
    this.typeSpecificData = data.typeSpecificData || {};
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.userID) errors.push('User ID is required');
    if (!this.title) errors.push('Title is required');
    if (!this.description) errors.push('Description is required');
    if (!this.postType || !['Waste', 'Initiative', 'Forum'].includes(this.postType)) {
      errors.push('Valid post type is required');
    }
    if (!['Active', 'Waiting', 'Scheduled', 'Collected', 'Inactive'].includes(this.status)) {
      errors.push('Valid status is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
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
      ...this.typeSpecificData
    };
  }

  // Static methods for database operations
  static async create(postData) {
    const db = getFirestore();
    const post = new Post(postData);
    
    const validation = post.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const postRef = doc(db, 'posts', post.postID);
      await setDoc(postRef, post.toFirestore());
      return post;
    } catch (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }
  }

  static async findById(postID) {
    const db = getFirestore();
    try {
      const postRef = doc(db, 'posts', postID);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = postSnap.data();
        
        // Return appropriate subclass based on postType
        switch (postData.postType) {
          case 'Waste':
            const WastePost = require('./WastePost');
            return new WastePost(postData);
          case 'Initiative':
            const InitiativePost = require('./InitiativePost');
            return new InitiativePost(postData);
          case 'Forum':
            const ForumPost = require('./ForumPost');
            return new ForumPost(postData);
          default:
            return new Post(postData);
        }
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find post: ${error.message}`);
    }
  }

  static async findByUserID(userID) {
    const db = getFirestore();
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('userID', '==', userID), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        posts.push(new Post(postData));
      });
      
      return posts;
    } catch (error) {
      throw new Error(`Failed to find posts by user: ${error.message}`);
    }
  }

  static async findByType(postType) {
    const db = getFirestore();
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('postType', '==', postType), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        posts.push(new Post(postData));
      });
      
      return posts;
    } catch (error) {
      throw new Error(`Failed to find posts by type: ${error.message}`);
    }
  }

  static async findByStatus(status) {
    const db = getFirestore();
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('status', '==', status), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        posts.push(new Post(postData));
      });
      
      return posts;
    } catch (error) {
      throw new Error(`Failed to find posts by status: ${error.message}`);
    }
  }

  static async findByLocation(location) {
    const db = getFirestore();
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('location', '==', location), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        posts.push(new Post(postData));
      });
      
      return posts;
    } catch (error) {
      throw new Error(`Failed to find posts by location: ${error.message}`);
    }
  }

  static async update(postID, updateData) {
    const db = getFirestore();
    try {
      updateData.updatedAt = new Date();
      const postRef = doc(db, 'posts', postID);
      await updateDoc(postRef, updateData);
      
      // Return updated post
      return await Post.findById(postID);
    } catch (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  static async delete(postID) {
    const db = getFirestore();
    try {
      const postRef = doc(db, 'posts', postID);
      await deleteDoc(postRef);
      return { success: true, message: 'Post deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Post.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Post.update(this.postID, updateData);
  }

  async delete() {
    return await Post.delete(this.postID);
  }

  // Get all comments for this post
  async getComments() {
    const Comment = require('./Comment');
    return await Comment.findByPostID(this.postID);
  }

  // Get all likes for this post
  async getLikes() {
    const Like = require('./Like');
    return await Like.findByPostID(this.postID);
  }

  // Get like count
  async getLikeCount() {
    const likes = await this.getLikes();
    return likes.length;
  }

  // Check if user liked this post
  async isLikedByUser(userID) {
    const Like = require('./Like');
    const like = await Like.findByPostAndUser(this.postID, userID);
    return !!like;
  }

  // Get all pickups for this post
  async getPickups() {
    const Pickup = require('./Pickup');
    return await Pickup.findByPostID(this.postID);
  }
}

module.exports = Post;