// Like.js - Firestore Like Model
const { getFirestore, collection, doc, setDoc, getDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Like {
  constructor(data = {}) {
    this.likeID = data.likeID || uuidv4();
    this.postID = data.postID || '';
    this.userID = data.userID || '';
    this.createdAt = data.createdAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.postID) errors.push('Post ID is required');
    if (!this.userID) errors.push('User ID is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      likeID: this.likeID,
      postID: this.postID,
      userID: this.userID,
      createdAt: this.createdAt
    };
  }

  // Static methods for database operations
  static async create(likeData) {
    const db = getFirestore();
    const like = new Like(likeData);
    
    const validation = like.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if user already liked this post
    const existingLike = await Like.findByPostAndUser(like.postID, like.userID);
    if (existingLike) {
      throw new Error('User has already liked this post');
    }

    try {
      const likeRef = doc(db, 'likes', like.likeID);
      await setDoc(likeRef, like.toFirestore());
      
      // Award points for liking
      const Point = require('./Point');
      await Point.create({
        userID: like.userID,
        pointsEarned: 1,
        transaction: 'Post_Interaction'
      });
      
      return like;
    } catch (error) {
      throw new Error(`Failed to create like: ${error.message}`);
    }
  }

  static async findById(likeID) {
    const db = getFirestore();
    try {
      const likeRef = doc(db, 'likes', likeID);
      const likeSnap = await getDoc(likeRef);
      
      if (likeSnap.exists()) {
        return new Like(likeSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find like: ${error.message}`);
    }
  }

  static async findByPostID(postID) {
    const db = getFirestore();
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, where('postID', '==', postID), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const likes = [];
      querySnapshot.forEach((doc) => {
        likes.push(new Like(doc.data()));
      });
      
      return likes;
    } catch (error) {
      throw new Error(`Failed to find likes by post: ${error.message}`);
    }
  }

  static async findByUserID(userID) {
    const db = getFirestore();
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, where('userID', '==', userID), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const likes = [];
      querySnapshot.forEach((doc) => {
        likes.push(new Like(doc.data()));
      });
      
      return likes;
    } catch (error) {
      throw new Error(`Failed to find likes by user: ${error.message}`);
    }
  }

  static async findByPostAndUser(postID, userID) {
    const db = getFirestore();
    try {
      const likesRef = collection(db, 'likes');
      const q = query(likesRef, 
        where('postID', '==', postID), 
        where('userID', '==', userID)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const likeDoc = querySnapshot.docs[0];
        return new Like(likeDoc.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find like by post and user: ${error.message}`);
    }
  }

  static async delete(likeID) {
    const db = getFirestore();
    try {
      const likeRef = doc(db, 'likes', likeID);
      await deleteDoc(likeRef);
      return { success: true, message: 'Like deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete like: ${error.message}`);
    }
  }

  static async unlike(postID, userID) {
    try {
      const existingLike = await Like.findByPostAndUser(postID, userID);
      if (existingLike) {
        await Like.delete(existingLike.likeID);
        return { success: true, message: 'Post unliked successfully' };
      } else {
        throw new Error('Like not found');
      }
    } catch (error) {
      throw new Error(`Failed to unlike post: ${error.message}`);
    }
  }

  static async toggleLike(postID, userID) {
    try {
      const existingLike = await Like.findByPostAndUser(postID, userID);
      
      if (existingLike) {
        // Unlike
        await Like.delete(existingLike.likeID);
        return { action: 'unliked', like: null };
      } else {
        // Like
        const newLike = await Like.create({ postID, userID });
        return { action: 'liked', like: newLike };
      }
    } catch (error) {
      throw new Error(`Failed to toggle like: ${error.message}`);
    }
  }

  static async getLikeCount(postID) {
    try {
      const likes = await Like.findByPostID(postID);
      return likes.length;
    } catch (error) {
      throw new Error(`Failed to get like count: ${error.message}`);
    }
  }

  static async getUsersWhoLiked(postID) {
    try {
      const likes = await Like.findByPostID(postID);
      const userIDs = likes.map(like => like.userID);
      
      // Get user details
      const User = require('./Users');
      const users = await Promise.all(
        userIDs.map(userID => User.findById(userID))
      );
      
      return users.filter(user => user !== null);
    } catch (error) {
      throw new Error(`Failed to get users who liked: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Like.create(this.toFirestore());
  }

  async delete() {
    return await Like.delete(this.likeID);
  }

  // Get the user who made this like
  async getUser() {
    const User = require('./Users');
    return await User.findById(this.userID);
  }

  // Get the post that was liked
  async getPost() {
    const Post = require('./Post');
    return await Post.findById(this.postID);
  }
}

module.exports = Like;