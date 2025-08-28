const mongoose = require('mongoose');
const Post = require('./Post');

// Create a discriminator schema that inherits from Post
const ForumPostSchema = new mongoose.Schema({
  category: { 
    type: String, 
    required: true,
    enum: ['General', 'Tips', 'News', 'Questions'],
    default: 'General'
  }
});

// Create ForumPost as a discriminator of Post
const ForumPost = Post.discriminator('Forum', ForumPostSchema);
module.exports = ForumPost;