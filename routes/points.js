const express = require('express');
const router = express.Router();
const User = require('../models/users_model');
const Point = require('../models/point_model');
const { verifyToken } = require('../middleware/auth');

// Add points to user
router.post('/add', verifyToken, async (req, res) => {
  try {
    const { points, transaction } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({ message: 'Invalid points value' });
    }

    const user = await User.findById(req.user.userID);
    await user.addPoints(points, transaction);

    res.json({
      message: 'Points added successfully',
      newBalance: user.points
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding points', error: error.message });
  }
});

// Get user's point history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const points = await Point.findByUser(req.user.userID);
    
    res.json({
      totalPoints: points.reduce((sum, p) => sum + p.pointsEarned, 0),
      history: points
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching point history', error: error.message });
  }
});

module.exports = router;