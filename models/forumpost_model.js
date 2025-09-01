// ForumPost.js - Firestore ForumPost Model (Inherits from Post)
const Post = require('./Post');

class ForumPost extends Post {
  constructor(data = {}) {
    super(data);
    
    // Ensure this is a Forum post
    this.postType = 'Forum';
    
    // Forum-specific fields
    this.category = data.category || 'General'; // General, Tips, News, Questions
    
    // Store forum-specific data in typeSpecificData
    this.typeSpecificData = {
      category: this.category
    };
  }

  // Override validation to include forum-specific validation
  validate() {
    const baseValidation = super.validate();
    const errors = [...baseValidation.errors];
    
    if (!['General', 'Tips', 'News', 'Questions'].includes(this.category)) {
      errors.push('Valid category is required for forum posts');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Override toFirestore to include forum-specific data
  toFirestore() {
    const baseData = super.toFirestore();
    return {
      ...baseData,
      category: this.category
    };
  }

  // Static methods for ForumPost-specific operations
  static async create(forumPostData) {
    const forumPost = new ForumPost(forumPostData);
    
    const validation = forumPost.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return await Post.create(forumPost.toFirestore());
  }

  static async findByCategory(category) {
    try {
      const allForumPosts = await Post.findByType('Forum');
      return allForumPosts.filter(post => post.category === category);
    } catch (error) {
      throw new Error(`Failed to find forum posts by category: ${error.message}`);
    }
  }

  static async getPopularPosts(limit = 10) {
    try {
      const allForumPosts = await Post.findByType('Forum');
      
      // Get like counts for each post (you'd implement this based on your like tracking)
      const postsWithLikes = await Promise.all(
        allForumPosts.map(async (post) => ({
          ...post,
          likeCount: await post.getLikeCount()
        }))
      );
      
      // Sort by like count and return top posts
      return postsWithLikes
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get popular forum posts: ${error.message}`);
    }
  }

  static async getRecentPostsByCategory(category, limit = 20) {
    try {
      const categoryPosts = await ForumPost.findByCategory(category);
      return categoryPosts
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get recent posts by category: ${error.message}`);
    }
  }

  // Instance methods for forum-specific operations
  
  // Update category
  async updateCategory(newCategory) {
    if (!['General', 'Tips', 'News', 'Questions'].includes(newCategory)) {
      throw new Error('Invalid category');
    }
    
    this.category = newCategory;
    await this.update({ category: this.category });
  }

  // Pin post (admin function)
  async pin() {
    await this.update({ isPinned: true });
  }

  // Unpin post (admin function)
  async unpin() {
    await this.update({ isPinned: false });
  }

  // Lock post from further comments (admin function)
  async lock() {
    await this.update({ isLocked: true });
  }

  // Unlock post for comments (admin function)
  async unlock() {
    await this.update({ isLocked: false });
  }

  // Get post engagement metrics
  async getEngagementMetrics() {
    const comments = await this.getComments();
    const likes = await this.getLikes();
    
    return {
      commentCount: comments.length,
      likeCount: likes.length,
      engagementScore: comments.length * 2 + likes.length, // Comments worth 2x likes
      lastActivity: comments.length > 0 ? 
        Math.max(...comments.map(c => c.createdAt)) : 
        this.createdAt
    };
  }

  // Check if post is trending (high engagement in last 24 hours)
  async isTrending() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const comments = await this.getComments();
    const likes = await this.getLikes();
    
    const recentComments = comments.filter(c => c.createdAt > oneDayAgo);
    const recentLikes = likes.filter(l => l.createdAt > oneDayAgo);
    
    return (recentComments.length + recentLikes.length) >= 5; // Threshold for trending
  }
}

module.exports = ForumPost;