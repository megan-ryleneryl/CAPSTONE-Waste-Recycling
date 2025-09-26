// routes/pickupRoutes.js - Complete API routes for Pickup Management
const express = require('express');
const router = express.Router();
const pickupController = require('../controllers/pickupController');
const { verifyToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(verifyToken);

// Create a new pickup schedule
router.post('/create', pickupController.createPickup);

// Get pickup details by ID
router.get('/:pickupID', pickupController.getPickupById);

// Get all pickups for current user
router.get('/user/all', pickupController.getUserPickups);

// Get upcoming pickups for current user
router.get('/user/upcoming', pickupController.getUpcomingPickups);

// Get pickups for a specific post
router.get('/post/:postID', pickupController.getPostPickups);

// Get active pickup for a post
router.get('/post/:postID/active', pickupController.getActivePickup);

// Confirm a pickup (Giver only)
router.put('/:pickupID/confirm', pickupController.confirmPickup);

// Start a pickup (Collector only)
router.put('/:pickupID/start', pickupController.startPickup);

// Complete a pickup (Giver only)
router.put('/:pickupID/complete', pickupController.completePickup);

// Cancel a pickup
router.put('/:pickupID/cancel', pickupController.cancelPickup);

// Update pickup details (before confirmation)
router.put('/:pickupID/update', pickupController.updatePickup);

// Check if pickup can be cancelled
router.get('/:pickupID/can-cancel', pickupController.checkCancellation);

module.exports = router;