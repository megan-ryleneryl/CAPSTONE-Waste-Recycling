const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  commentID: { 
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
  content: { 
    type: String, 
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now
  }
});

const Comment = mongoose.model('comments', CommentSchema);
module.exports = Comment;