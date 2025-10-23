const DisposalHub = require('../models/DisposalHub');

const disposalHubController = {
  // GET nearby disposal hubs
  async getNearbyHubs(req, res) {
    try {
      const { lat, lng, radius, type, material, verified } = req.query;

      // Validate required parameters
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusKm = radius ? parseFloat(radius) : 10; // Default 10km

      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Coordinates out of range'
        });
      }

      // Build filters
      const filters = {};
      if (type) filters.type = type;
      if (material) filters.material = material;
      if (verified !== undefined) filters.verified = verified === 'true';

      // Find nearby hubs
      const hubs = await DisposalHub.findNearby(latitude, longitude, radiusKm, filters);

      res.json({
        success: true,
        data: hubs,
        count: hubs.length,
        filters: {
          coordinates: { lat: latitude, lng: longitude },
          radius: radiusKm,
          ...filters
        }
      });
    } catch (error) {
      console.error('Error getting nearby hubs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby disposal hubs',
        error: error.message
      });
    }
  },

  // GET all disposal hubs
  async getAllHubs(req, res) {
    try {
      const hubs = await DisposalHub.findAll();

      res.json({
        success: true,
        data: hubs,
        count: hubs.length
      });
    } catch (error) {
      console.error('Error getting all hubs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch disposal hubs',
        error: error.message
      });
    }
  },

  // GET disposal hub by ID
  async getHubById(req, res) {
    try {
      const { hubID } = req.params;

      const hub = await DisposalHub.findById(hubID);

      if (!hub) {
        return res.status(404).json({
          success: false,
          message: 'Disposal hub not found'
        });
      }

      res.json({
        success: true,
        data: hub
      });
    } catch (error) {
      console.error('Error getting hub by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch disposal hub',
        error: error.message
      });
    }
  },

  // POST suggest a new disposal hub
  async suggestHub(req, res) {
    try {
      const userID = req.user.userID;
      const hubData = req.body;

      // Validate required fields
      const requiredFields = ['name', 'type', 'coordinates', 'address'];
      const missingFields = requiredFields.filter(field => !hubData[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Validate coordinates
      if (!hubData.coordinates.lat || !hubData.coordinates.lng) {
        return res.status(400).json({
          success: false,
          message: 'Valid coordinates (lat, lng) are required'
        });
      }

      // Validate type
      if (!['MRF', 'Junk Shop'].includes(hubData.type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "MRF" or "Junk Shop"'
        });
      }

      // Create hub (unverified by default unless user is admin)
      const hub = await DisposalHub.create({
        ...hubData,
        addedBy: userID,
        verified: req.user.isAdmin || false // Auto-verify if added by admin
      });

      res.status(201).json({
        success: true,
        message: req.user.isAdmin
          ? 'Disposal hub created and verified'
          : 'Disposal hub suggestion submitted for review',
        data: hub
      });
    } catch (error) {
      console.error('Error suggesting hub:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create disposal hub',
        error: error.message
      });
    }
  },

  // POST add rating to disposal hub
  async addRating(req, res) {
    try {
      const { hubID } = req.params;
      const { rating } = req.body;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const updatedHub = await DisposalHub.addRating(hubID, rating);

      if (!updatedHub) {
        return res.status(404).json({
          success: false,
          message: 'Disposal hub not found'
        });
      }

      res.json({
        success: true,
        message: 'Rating added successfully',
        data: updatedHub
      });
    } catch (error) {
      console.error('Error adding rating:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add rating',
        error: error.message
      });
    }
  },

  // GET unverified hubs (admin only)
  async getUnverifiedHubs(req, res) {
    try {
      const hubs = await DisposalHub.findUnverified();

      res.json({
        success: true,
        data: hubs,
        count: hubs.length
      });
    } catch (error) {
      console.error('Error getting unverified hubs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unverified hubs',
        error: error.message
      });
    }
  },

  // PUT verify a disposal hub (admin only)
  async verifyHub(req, res) {
    try {
      const { hubID } = req.params;
      const adminUserID = req.user.userID;

      const hub = await DisposalHub.verify(hubID, adminUserID);

      if (!hub) {
        return res.status(404).json({
          success: false,
          message: 'Disposal hub not found'
        });
      }

      res.json({
        success: true,
        message: 'Disposal hub verified successfully',
        data: hub
      });
    } catch (error) {
      console.error('Error verifying hub:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify disposal hub',
        error: error.message
      });
    }
  },

  // PUT update disposal hub (admin only)
  async updateHub(req, res) {
    try {
      const { hubID } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.hubID;
      delete updates.createdAt;
      delete updates.addedBy;

      const hub = await DisposalHub.update(hubID, updates);

      if (!hub) {
        return res.status(404).json({
          success: false,
          message: 'Disposal hub not found'
        });
      }

      res.json({
        success: true,
        message: 'Disposal hub updated successfully',
        data: hub
      });
    } catch (error) {
      console.error('Error updating hub:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update disposal hub',
        error: error.message
      });
    }
  },

  // PUT update hub status (admin only)
  async updateHubStatus(req, res) {
    try {
      const { hubID } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const hub = await DisposalHub.updateStatus(hubID, status);

      if (!hub) {
        return res.status(404).json({
          success: false,
          message: 'Disposal hub not found'
        });
      }

      res.json({
        success: true,
        message: 'Hub status updated successfully',
        data: hub
      });
    } catch (error) {
      console.error('Error updating hub status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update hub status',
        error: error.message
      });
    }
  },

  // DELETE disposal hub (admin only)
  async deleteHub(req, res) {
    try {
      const { hubID } = req.params;

      // Instead of actually deleting, mark as permanently closed
      const hub = await DisposalHub.updateStatus(hubID, 'Permanently Closed');

      if (!hub) {
        return res.status(404).json({
          success: false,
          message: 'Disposal hub not found'
        });
      }

      res.json({
        success: true,
        message: 'Disposal hub marked as permanently closed',
        data: hub
      });
    } catch (error) {
      console.error('Error deleting hub:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete disposal hub',
        error: error.message
      });
    }
  }
};

module.exports = disposalHubController;
