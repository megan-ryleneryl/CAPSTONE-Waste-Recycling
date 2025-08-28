const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  messageID: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => require('uuid').v4()
  },
  senderID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  receiverID: { 
    type: String, 
    required: true,
    ref: 'users'
  },
  postID: { 
    type: String, 
    required: true,
    ref: 'posts'
  },
  message: { 
    type: String, 
    required: true
  },
  sentAt: { 
    type: Date, 
    default: Date.now
  }
});

const Message = mongoose.model('messages', MessageSchema);
module.exports = Message;