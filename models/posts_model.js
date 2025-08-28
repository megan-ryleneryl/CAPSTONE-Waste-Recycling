const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  postID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  userID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  postType: { 
    type: String, 
    required: true,
    enum: ['Waste', 'Initiative', 'Forum']
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 255
  },
  description: { 
    type: String, 
    required: true
  },
  location: { 
    type: String,
    maxlength: 255
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Active', 'Waiting', 'Scheduled', 'Collected', 'Inactive'],
    default: 'Active'
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  },
  updatedAt: { 
    type: Date, 
    default: Date.now
  }
});

const Post = mongoose.model('posts', PostSchema);
module.exports = Post;