// controllers/pickupController.js - Complete controller for Pickup Management
const Pickup = require('../models/Pickup');
const Post = require('../models/Posts');
const User = require('../models/Users');
const Message = require('../models/Message');
const GeocodingService = require('../services/geocodingService');

class PickupController {
  // Create a new pickup schedule
static async createPickup(req, res) {
  try {
    const user = req.user;
    const {
      postID,
      pickupDate,
      pickupTime,
      pickupLocation,
      contactPerson,
      contactNumber,
      alternateContact,
      specialInstructions
    } = req.body;

    // Validate required fields
    if (!postID || !pickupDate || !pickupTime || !pickupLocation || !contactPerson || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get the post details
    const post = await Post.findById(postID);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if there's already an active pickup for this post
    const existingPickup = await Pickup.getActiveForPost(postID);
    if (existingPickup) {
      return res.status(400).json({
        success: false,
        message: 'An active pickup already exists for this post'
      });
    }

    // Determine giver and collector based on post type
    let giverID, collectorID, giverName, collectorName;
    
    if (post.postType === 'Waste') {
      // For Waste posts, the post creator is the giver
      giverID = post.userID;
      collectorID = user.userID;
      
      // FIXED: Check isCollector instead of userType
      if (!user.isCollector) {
        return res.status(403).json({
          success: false,
          message: 'Only collectors can schedule pickups for waste posts'
        });
      }
    } else if (post.postType === 'Initiative') {
      // For Initiative posts, the post creator is the collector
      giverID = user.userID;
      collectorID = post.userID;
      
      // For initiatives, we need to check if the giver's donation was accepted
      // This would require additional logic to track initiative support
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid post type for pickup scheduling'
      });
    }

    // Get user names for the pickup record
    const giverUser = await User.findById(giverID);
    const collectorUser = await User.findById(collectorID);
    
    giverName = `${giverUser.firstName} ${giverUser.lastName}`;
    collectorName = `${collectorUser.firstName} ${collectorUser.lastName}`;

    // Geocode the pickup location if coordinates are not provided
    let locationWithCoords = pickupLocation;
    if (pickupLocation && !pickupLocation.coordinates?.lat) {
      console.log('🗺️ Geocoding pickup location...');
      const coords = await GeocodingService.getCoordinates(pickupLocation);

      if (coords) {
        locationWithCoords = {
          ...pickupLocation,
          coordinates: {
            lat: coords.lat,
            lng: coords.lng
          }
        };
        console.log('✅ Pickup location coordinates added:', coords);
      } else {
        console.log('⚠️ Geocoding failed for pickup location, proceeding without coordinates');
      }
    }

    // Create the pickup
    const pickupData = {
      postID,
      postType: post.postType,
      giverID,
      collectorID,
      giverName,
      collectorName,
      pickupDate,
      pickupTime,
      pickupLocation: locationWithCoords,
      contactPerson,
      contactNumber,
      alternateContact,
      specialInstructions,
      status: 'Proposed',
      createdBy: user.userID
    };

    const pickup = await Pickup.create(pickupData);

    // Send notification to the giver
    const Notification = require('../models/Notification');
    await Notification.create({
      userID: giverID,
      type: Notification.TYPES.PICKUP_SCHEDULED,
      title: 'New Pickup Schedule Proposed',
      message: `${collectorName} has proposed a pickup schedule for "${post.title}"`,
      referenceID: pickup.pickupID,
      referenceType: 'pickup',
      actionURL: `/pickups/${pickup.pickupID}`,
      priority: 'high'
    });

    res.status(201).json({
      success: true,
      message: 'Pickup schedule created successfully',
      data: pickup
    });

  } catch (error) {
    console.error('Error creating pickup:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create pickup schedule'
    });
  }
}

  // Get pickup by ID
  static async getPickupById(req, res) {
    try {
      const { pickupID } = req.params;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);
      
      // Check if user is authorized to view this pickup
      if (pickup.giverID !== userID && pickup.collectorID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view this pickup'
        });
      }

      res.json({
        success: true,
        data: pickup
      });

    } catch (error) {
      console.error('Error fetching pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pickup'
      });
    }
  }

static async getUserPickups(req, res) {
  try {
    const userID = req.user.userID;
    const { role = 'both', status } = req.query;

    const pickups = await Pickup.findByUser(userID, role);
    
    // Filter by status if provided
    let filteredPickups = pickups;
    if (status) {
      filteredPickups = pickups.filter(p => p.status === status);
    }

    res.status(200).json({
      success: true,
      data: filteredPickups,
      count: filteredPickups.length
    });
  } catch (error) {
    console.error('Error fetching user pickups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pickups'
    });
  }
}

static async getUpcomingPickups(req, res) {
  try {
    const userID = req.user.userID;
    const pickups = await Pickup.findByUser(userID, 'both');
    
    // Filter for upcoming pickups (Proposed or Confirmed)
    const upcomingPickups = pickups.filter(p => 
      ['Proposed', 'Confirmed'].includes(p.status) &&
      new Date(p.pickupDate) >= new Date()
    );

    // Sort by date
    upcomingPickups.sort((a, b) => 
      new Date(a.pickupDate) - new Date(b.pickupDate)
    );

    res.status(200).json({
      success: true,
      data: upcomingPickups.slice(0, 5), // Return top 5
      count: upcomingPickups.length
    });
  } catch (error) {
    console.error('Error fetching upcoming pickups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming pickups'
    });
  }
}

  // Get pickups for a specific post
  static async getPostPickups(req, res) {
    try {
      const { postID } = req.params;
      const userID = req.user.userID;

      // Verify user has access to this post
      const post = await Post.findById(postID);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if user is involved with the post
      // You might want to add more complex authorization logic here
      
      const pickups = await Pickup.findByPost(postID);

      res.json({
        success: true,
        data: pickups
      });

    } catch (error) {
      console.error('Error fetching post pickups:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch pickups for post'
      });
    }
  }

  // Get active pickup for a post
  static async getActivePickup(req, res) {
    try {
      const { postID } = req.params;
      
      const activePickup = await Pickup.getActiveForPost(postID);
      
      res.json({
        success: true,
        data: activePickup,
        hasActive: activePickup !== null
      });

    } catch (error) {
      console.error('Error fetching active pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch active pickup'
      });
    }
  }

  // Confirm pickup (Giver only)
  static async confirmPickup(req, res) {
    try {
      const { pickupID } = req.params;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);
      
      if (pickup.giverID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Only the giver can confirm the pickup'
        });
      }

      if (pickup.status !== 'Proposed') {
        return res.status(400).json({
          success: false,
          message: 'Only proposed pickups can be confirmed'
        });
      }

      await pickup.confirm(userID);

      // Update post status to "Claimed" if it's a waste post
      if (pickup.postType === 'Waste') {
        await Post.updateStatus(pickup.postID, 'Claimed');
      }

      res.json({
        success: true,
        message: 'Pickup confirmed successfully',
        data: pickup
      });

    } catch (error) {
      console.error('Error confirming pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to confirm pickup'
      });
    }
  }

  // Start pickup (Collector arrives)
  static async startPickup(req, res) {
    try {
      const { pickupID } = req.params;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);
      
      if (pickup.collectorID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Only the assigned collector can start the pickup'
        });
      }

      await pickup.startPickup(userID);

      // Send notification to giver
      await Message.create({
        senderID: 'system',
        receiverID: pickup.giverID,
        postID: pickup.postID,
        messageType: 'system',
        message: 'Collector has arrived for pickup',
        metadata: {
          pickupID: pickup.pickupID,
          action: 'pickup_started'
        }
      });

      res.json({
        success: true,
        message: 'Pickup started successfully',
        data: pickup
      });

    } catch (error) {
      console.error('Error starting pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to start pickup'
      });
    }
  }

  // Complete pickup
  static async completePickup(req, res) {
    try {
      const { pickupID } = req.params;
      const {
        actualWaste,
        paymentReceived,
        paymentMethod,
        completionNotes,
        identityVerified,
        verificationMethod
      } = req.body;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);

      // Only giver can complete the pickup
      if (pickup.giverID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Only the giver can complete the pickup'
        });
      }

      // Validate status
      if (pickup.status !== 'In-Transit' && pickup.status !== 'ArrivedAtPickup' && pickup.status !== 'Confirmed') {
        return res.status(400).json({
          success: false,
          message: 'Invalid pickup status for completion'
        });
      }

      // Validate required completion data
      if (!actualWaste || !actualWaste.finalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Actual waste details are required to complete the pickup'
        });
      }

      if (paymentReceived === undefined || paymentReceived === null) {
        return res.status(400).json({
          success: false,
          message: 'Payment information is required to complete the pickup'
        });
      }

      // Complete the pickup
      await pickup.complete({
        actualWaste,
        paymentReceived,
        paymentMethod,
        completionNotes,
        identityVerified,
        verificationMethod
      });

      // Send completion notification to collector
      await Message.create({
        senderID: 'system',
        receiverID: pickup.collectorID,
        postID: pickup.postID,
        messageType: 'system',
        message: 'Pickup has been completed successfully',
        metadata: {
          pickupID: pickup.pickupID,
          action: 'pickup_completed',
          finalAmount: actualWaste?.finalAmount,
          paymentReceived
        }
      });

      res.json({
        success: true,
        message: 'Pickup completed successfully',
        data: pickup
      });

    } catch (error) {
      console.error('Error completing pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to complete pickup'
      });
    }
  }

  // Cancel pickup
  static async cancelPickup(req, res) {
    try {
      const { pickupID } = req.params;
      const { reason } = req.body;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);
      
      // Check if user is authorized to cancel
      if (pickup.giverID !== userID && pickup.collectorID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to cancel this pickup'
        });
      }

      // Check if cancellation is allowed
      if (!pickup.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'This pickup cannot be cancelled. Pickups must be cancelled at least 5 hours before the scheduled time.'
        });
      }

      await pickup.cancel(userID, reason);

      res.json({
        success: true,
        message: 'Pickup cancelled successfully',
        data: pickup
      });

    } catch (error) {
      console.error('Error cancelling pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel pickup'
      });
    }
  }

  // Update pickup details (only before confirmation)
  static async updatePickup(req, res) {
    try {
      const { pickupID } = req.params;
      const updates = req.body;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);
      
      // Check authorization
      if (pickup.proposedBy !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Only the person who proposed the pickup can update it'
        });
      }

      // Only allow updates if status is 'Proposed'
      if (pickup.status !== 'Proposed') {
        return res.status(400).json({
          success: false,
          message: 'Can only update proposed pickups'
        });
      }

      // Allowed fields for update
      const allowedFields = [
        'pickupDate',
        'pickupTime',
        'pickupLocation',
        'contactPerson',
        'contactNumber',
        'alternateContact',
        'specialInstructions'
      ];

      const filteredUpdates = {};
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });

      // Geocode the pickup location if it's being updated
      if (filteredUpdates.pickupLocation) {
        // Check if location is a string (from edit form) or object without coordinates
        const isString = typeof filteredUpdates.pickupLocation === 'string';
        const needsGeocoding = !filteredUpdates.pickupLocation.coordinates?.lat;

        if (isString) {
          console.log('⚠️ Location received as string, cannot geocode without PSGC structure. Keeping as string.');
          // If it's a string, we can't geocode it properly without PSGC data
          // Keep it as is for now - ideally the frontend should send proper PSGC structure
        } else if (needsGeocoding) {
          // Location is an object without coordinates, try to geocode it
          console.log('🗺️ Geocoding updated pickup location...');
          const coords = await GeocodingService.getCoordinates(filteredUpdates.pickupLocation);

          if (coords) {
            filteredUpdates.pickupLocation = {
              ...filteredUpdates.pickupLocation,
              coordinates: {
                lat: coords.lat,
                lng: coords.lng
              }
            };
            console.log('✅ Updated pickup location coordinates added:', coords);
          } else {
            console.log('⚠️ Geocoding failed for updated pickup location, proceeding without coordinates');
          }
        }
      }

      await pickup.update(filteredUpdates);

      // Notify the other party about the update
      const otherUserID = userID === pickup.giverID ? pickup.collectorID : pickup.giverID;
      await Message.create({
        senderID: 'system',
        receiverID: otherUserID,
        postID: pickup.postID,
        messageType: 'system',
        message: 'Pickup schedule has been updated',
        metadata: {
          pickupID: pickup.pickupID,
          action: 'pickup_updated',
          updates: filteredUpdates
        }
      });

      res.json({
        success: true,
        message: 'Pickup updated successfully',
        data: pickup
      });

    } catch (error) {
      console.error('Error updating pickup:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update pickup'
      });
    }
  }

  // Check if pickup can be cancelled
  static async checkCancellation(req, res) {
    try {
      const { pickupID } = req.params;
      const userID = req.user.userID;

      const pickup = await Pickup.findById(pickupID);
      
      // Check if user is involved in the pickup
      if (pickup.giverID !== userID && pickup.collectorID !== userID) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to check this pickup'
        });
      }

      const canCancel = pickup.canBeCancelled();
      let message = canCancel 
        ? 'Pickup can be cancelled'
        : 'Pickup cannot be cancelled (less than 5 hours before scheduled time or already completed)';

      res.json({
        success: true,
        canCancel,
        message
      });

    } catch (error) {
      console.error('Error checking cancellation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check cancellation status'
      });
    }
  }
}

module.exports = PickupController;