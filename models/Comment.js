// Comment.js - Firestore Comment Model
const { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

class Comment {
  constructor(data = {}) {
    this.commentID = data.commentID || uuidv4();
    this.postID = data.postID || '';
    this.userID = data.userID || '';
    this.content = data.content || '';
    this.createdAt = data.createdAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];
    
    if (!this.postID) errors.push('Post ID is required');
    if (!this.userID) errors.push('User ID is required');
    if (!this.content || this.content.trim().length === 0) {
      errors.push('Comment content is required');
    }
    if (this.content.length > 1000) {
      errors.push('Comment content must be less than 1000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      commentID: this.commentID,
      postID: this.postID,
      userID: this.userID,
      content: this.content.trim(),
      createdAt: this.createdAt
    };
  }

  // Static methods for database operations
  static async create(commentData) {
    const db = getFirestore();
    const comment = new Comment(commentData);
    
    const validation = comment.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const commentRef = doc(db, 'comments', comment.commentID);
      await setDoc(commentRef, comment.toFirestore());
      
      // Award points for commenting
      const Point = require('./Point');
      await Point.create({
        userID: comment.userID,
        pointsEarned: 2,
        transaction: 'Post_Interaction'
      });
      
      return comment;
    } catch (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }
  }

  static async findById(commentID) {
    const db = getFirestore();
    try {
      const commentRef = doc(db, 'comments', commentID);
      const commentSnap = await getDoc(commentRef);
      
      if (commentSnap.exists()) {
        return new Comment(commentSnap.data());
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to find comment: ${error.message}`);
    }
  }

  static async findByPostID(postID) {
    const db = getFirestore();
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, where('postID', '==', postID), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const comments = [];
      querySnapshot.forEach((doc) => {
        comments.push(new Comment(doc.data()));
      });
      
      return comments;
    } catch (error) {
      throw new Error(`Failed to find comments by post: ${error.message}`);
    }
  }

  static async findByUserID(userID) {
    const db = getFirestore();
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, where('userID', '==', userID), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const comments = [];
      querySnapshot.forEach((doc) => {
        comments.push(new Comment(doc.data()));
      });
      
      return comments;
    } catch (error) {
      throw new Error(`Failed to find comments by user: ${error.message}`);
    }
  }

  static async update(commentID, updateData) {
    const db = getFirestore();
    try {
      const commentRef = doc(db, 'comments', commentID);
      await updateDoc(commentRef, updateData);
      
      return await Comment.findById(commentID);
    } catch (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }
  }

  static async delete(commentID) {
    const db = getFirestore();
    try {
      const commentRef = doc(db, 'comments', commentID);
      await deleteDoc(commentRef);
      return { success: true, message: 'Comment deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  // Instance methods
  async save() {
    return await Comment.create(this.toFirestore());
  }

  async update(updateData) {
    Object.assign(this, updateData);
    return await Comment.update(this.commentID, updateData);
  }

  async delete() {
    return await Comment.delete(this.commentID);
  }

  // Edit comment content
  async editContent(newContent) {
    if (!newContent || newContent.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }
    if (newContent.length > 1000) {
      throw new Error('Comment content must be less than 1000 characters');
    }
    
    await this.update({
      content: newContent.trim(),
      editedAt: new Date()
    });
  }

  // Check if comment can be edited (within 15 minutes of creation)
  canBeEdited() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return this.createdAt > fifteenMinutesAgo;
  }

  // Check if comment can be deleted by user (within 30 minutes)
  canBeDeletedByUser() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return this.createdAt > thirtyMinutesAgo;
  }

  // Get comment age in human readable format
  getAge() {
    const now = new Date();
    const diffTime = now - this.createdAt;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.createdAt.toLocaleDateString();
  }
}

module.exports = Comment;