// routes/messageRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth'); // ← FIXED: Use your existing middleware name

// All message routes require authentication
router.use(verifyToken); // ← FIXED: Use verifyToken instead of authenticate

// Conversations (new endpoints for Module 2)
router.get('/conversations', messageController.getUserConversations);
router.get('/conversations/:postID/:otherUserID', messageController.getConversation);
router.put('/conversations/:postID/:otherUserID/read', messageController.markConversationAsRead);

// Messages
router.post('/send', messageController.sendMessage);
router.post('/pickup-request', messageController.sendPickupRequest);

// Utility routes
router.get('/unread-count', messageController.getUnreadCount);

// Your existing message routes can stay the same if you have them
// router.get('/', messageController.getAllMessages);
// router.get('/:messageID', messageController.getMessageById);
// router.delete('/:messageID', messageController.deleteMessage);

module.exports = router;