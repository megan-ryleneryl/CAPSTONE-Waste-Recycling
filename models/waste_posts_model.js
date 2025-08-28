const mongoose = require('mongoose');
const Post = require('./Post');

// Create a discriminator schema that inherits from Post
const WastePostSchema = new mongoose.Schema({
  items: [{ 
    itemName: { type: String, required: true },
    materialID: { type: String, required: true },
    sellingPrice: { type: Number, required: true },
    kg: { type: Number, required: true }
  }]
});

// Create WastePost as a discriminator of Post
const WastePost = Post.discriminator('Waste', WastePostSchema);
module.exports = WastePost;