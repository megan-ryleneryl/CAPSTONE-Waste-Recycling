const express = require('express');
const router = express.Router();
const disposalHubController = require('../controllers/disposalHubController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Public routes (no authentication required)
// GET nearby disposal hubs based on coordinates
router.get('/nearby', disposalHubController.getNearbyHubs);

// GET all disposal hubs
router.get('/', disposalHubController.getAllHubs);

// GET specific disposal hub by ID
router.get('/:hubID', disposalHubController.getHubById);

// Protected routes (authentication required)
// POST suggest a new disposal hub (any authenticated user)
router.post('/suggest', verifyToken, disposalHubController.suggestHub);

// POST add rating to a disposal hub
router.post('/:hubID/rating', verifyToken, disposalHubController.addRating);

// Admin-only routes
// GET unverified hubs (admin review)
router.get('/admin/unverified', verifyToken, requireAdmin, disposalHubController.getUnverifiedHubs);

// PUT verify a disposal hub
router.put('/:hubID/verify', verifyToken, requireAdmin, disposalHubController.verifyHub);

// PUT update disposal hub
router.put('/:hubID', verifyToken, requireAdmin, disposalHubController.updateHub);

// PUT update hub status
router.put('/:hubID/status', verifyToken, requireAdmin, disposalHubController.updateHubStatus);

// DELETE disposal hub
router.delete('/:hubID', verifyToken, requireAdmin, disposalHubController.deleteHub);

module.exports = router;
