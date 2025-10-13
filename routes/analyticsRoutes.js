const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/auth');

// All analytics routes require authentication
router.use(verifyToken);

// Main dashboard analytics endpoint
router.get('/dashboard', analyticsController.getDashboardAnalytics);

// Heatmap data endpoint
router.get('/heatmap', analyticsController.getHeatmapData);

// Nearby disposal sites endpoint
router.get('/disposal-sites', analyticsController.getNearbyDisposalSites);

module.exports = router;