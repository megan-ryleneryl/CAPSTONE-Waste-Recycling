// TODO
// Check for userType usage

const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Post {
  constructor(data = {}) {
    this.postID = data.postID || uuidv4();
    this.userID = data.userID || '';
    this.userType = data.userType || ''; // Add userType field
    this.postType = data.postType || ''; // Waste, Initiative, Forum
    this.title = data.title || '';
    this.description = data.description || '';
    this.location = data.location || '';
    this.status = data.status || 'Active'; // Active, Claimed, Completed, Cancelled, Inactive, Locked, Hidden
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    
    // REMOVED typeSpecificData - fields should be added directly by subclasses
    // This ensures consistent flat structure in Firestore
  }

  // Validation
  validate() {
  const errors = [];
  
  if (!this.userID) errors.push('User ID is required');
  if (!this.title) errors.push('Title is required');
  if (!this.description) errors.push('Description is required');
  if (!this.location) errors.push('Location is required');
  if (!this.postType || !['Waste', 'Initiative', 'Forum'].includes(this.postType)) {
    errors.push('Valid post type is required (Waste, Initiative, or Forum)');
  }
  
  // FIXED: More flexible status validation - set default if not provided
  if (!this.status) {
    // Set default status based on post type
    switch(this.postType) {
      case 'Waste':
        this.status = 'Active';
        break;
      case 'Initiative':
      case 'Forum':
        this.status = 'Active';
        break;
      default:
        this.status = 'Active';
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

  // Get valid statuses based on post type
  getValidStatuses() {
    switch(this.postType) {
      case 'Waste':
        return ['Active', 'Claimed', 'Completed', 'Cancelled'];
      case 'Initiative':
        return ['Active', 'Completed', 'Cancelled'];
      case 'Forum':
        return ['Active', 'Locked', 'Hidden'];
      default:
        return ['Active', 'Inactive'];
    }
  }

  // Convert to plain object for Firestore - IMPORTANT: Flat structure
  toFirestore() {
    // Return only base fields - subclasses will override to add their specific fields
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
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database operations
  static async create(postData) {
    const db = getFirestore();
    
    // Determine which subclass to use based on postType
    let post;
    switch(postData.postType) {
      case 'Waste':
        const WastePost = require('./WastePost');
        post = new WastePost(postData);
        break;
      case 'Initiative':
        const InitiativePost = require('./InitiativePost');
        post = new InitiativePost(postData);
        break;
      case 'Forum':
        const ForumPost = require('./ForumPost');
        post = new ForumPost(postData);
        break;
      default:
        post = new Post(postData);
    }
    
    const validation = post.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const postRef = doc(db, 'posts', post.postID);
      const firestoreData = post.toFirestore();
      
      console.log('Creating post with data:', JSON.stringify(firestoreData, null, 2));
      await setDoc(postRef, firestoreData);
      
      return post;
    } catch (error) {
      console.error('Firestore error in Post.create:', error);
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

  static async findAll() {
    const db = getFirestore();
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const posts = [];
      querySnapshot.forEach((doc) => {
        const postData = doc.data();
        // Create appropriate subclass instance
        switch (postData.postType) {
          case 'Waste':
            const WastePost = require('./WastePost');
            posts.push(new WastePost(postData));
            break;
          case 'Initiative':
            const InitiativePost = require('./InitiativePost');
            posts.push(new InitiativePost(postData));
            break;
          case 'Forum':
            const ForumPost = require('./ForumPost');
            posts.push(new ForumPost(postData));
            break;
          default:
            posts.push(new Post(postData));
        }
      });
      
      return posts;
    } catch (error) {
      console.error('Error in findAll:', error);
      throw new Error(`Failed to find all posts: ${error.message}`);
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
        // Create appropriate subclass instance
        switch (postData.postType) {
          case 'Waste':
            const WastePost = require('./WastePost');
            posts.push(new WastePost(postData));
            break;
          case 'Initiative':
            const InitiativePost = require('./InitiativePost');
            posts.push(new InitiativePost(postData));
            break;
          case 'Forum':
            const ForumPost = require('./ForumPost');
            posts.push(new ForumPost(postData));
            break;
          default:
            posts.push(new Post(postData));
        }
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
        // Create appropriate subclass instance
        switch (postData.postType) {
          case 'Waste':
            const WastePost = require('./WastePost');
            posts.push(new WastePost(postData));
            break;
          case 'Initiative':
            const InitiativePost = require('./InitiativePost');
            posts.push(new InitiativePost(postData));
            break;
          case 'Forum':
            const ForumPost = require('./ForumPost');
            posts.push(new ForumPost(postData));
            break;
          default:
            posts.push(new Post(postData));
        }
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
        // Create appropriate subclass instance
        switch (postData.postType) {
          case 'Waste':
            const WastePost = require('./WastePost');
            posts.push(new WastePost(postData));
            break;
          case 'Initiative':
            const InitiativePost = require('./InitiativePost');
            posts.push(new InitiativePost(postData));
            break;
          case 'Forum':
            const ForumPost = require('./ForumPost');
            posts.push(new ForumPost(postData));
            break;
          default:
            posts.push(new Post(postData));
        }
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
        // Create appropriate subclass instance
        switch (postData.postType) {
          case 'Waste':
            const WastePost = require('./WastePost');
            posts.push(new WastePost(postData));
            break;
          case 'Initiative':
            const InitiativePost = require('./InitiativePost');
            posts.push(new InitiativePost(postData));
            break;
          case 'Forum':
            const ForumPost = require('./ForumPost');
            posts.push(new ForumPost(postData));
            break;
          default:
            posts.push(new Post(postData));
        }
      });
      
      return posts;
    } catch (error) {
      throw new Error(`Failed to find posts by location: ${error.message}`);
    }
  }

  static async update(postID, updateData) {
    const db = getFirestore();
    try {
      // Add timestamp
      updateData.updatedAt = new Date();
      
      // Remove fields that shouldn't be updated
      delete updateData.postID;
      delete updateData.userID;
      delete updateData.createdAt;
      
      console.log('Updating post with data:', JSON.stringify(updateData, null, 2));
      
      const postRef = doc(db, 'posts', postID);
      await updateDoc(postRef, updateData);
      
      // Return updated post
      return await Post.findById(postID);
    } catch (error) {
      console.error('Error in Post.update:', error);
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
    // Use the static create method but with this instance's data
    const firestoreData = this.toFirestore();
    return await Post.create(firestoreData);
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