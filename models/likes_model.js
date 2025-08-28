const mongoose = require('mongoose');

const LikeSchema = new mongoose.Schema({
  likeID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  postID: { 
    type: String, 
    required: true,
    ref: 'posts'
  },
  userID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  }
});

const Like = mongoose.model('likes', LikeSchema);
module.exports = Like;