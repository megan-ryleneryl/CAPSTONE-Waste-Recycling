const mongoose = require('mongoose');
const Post = require('./Post');

// Create a discriminator schema that inherits from Post
const InitiativePostSchema = new mongoose.Schema({
  materials: [{ 
    itemName: { type: String, required: true },
    materialID: { type: String, required: true },
    kg: { type: Number, required: true }
  }],
  projectDeadline: { 
    type: Date
  }
});

// Create InitiativePost as a discriminator of Post
const InitiativePost = Post.discriminator('Initiative', InitiativePostSchema);
module.exports = InitiativePost;