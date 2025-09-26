// services/pickupCancellation.js
class PickupCancellationService {
  /**
   * Check if a pickup can be cancelled based on the 5-hour rule
   * @param {Object} pickup - The pickup object
   * @returns {Object} - { canCancel: boolean, reason: string, hoursUntil: number }
   */
  static canCancelPickup(pickup) {
    // Cannot cancel completed pickups
    if (pickup.status === 'Completed') {
      return {
        canCancel: false,
        reason: 'Completed pickups cannot be cancelled',
        hoursUntil: null
      };
    }

    // Already cancelled
    if (pickup.status === 'Cancelled') {
      return {
        canCancel: false,
        reason: 'This pickup has already been cancelled',
        hoursUntil: null
      };
    }

    // Calculate hours until pickup
    const pickupDateTime = new Date(`${pickup.pickupDate}T${pickup.pickupTime}`);
    const now = new Date();
    const hoursUntilPickup = (pickupDateTime - now) / (1000 * 60 * 60);

    // Check if pickup time has passed
    if (hoursUntilPickup < 0) {
      return {
        canCancel: false,
        reason: 'Cannot cancel past pickups',
        hoursUntil: 0
      };
    }

    // Proposed pickups can always be cancelled
    if (pickup.status === 'Proposed') {
      return {
        canCancel: true,
        reason: 'Proposed pickups can be cancelled anytime',
        hoursUntil: Math.round(hoursUntilPickup)
      };
    }

    // For confirmed pickups, check 5-hour rule
    if (hoursUntilPickup < 5) {
      return {
        canCancel: false,
        reason: `Cannot cancel within 5 hours of pickup. ${hoursUntilPickup.toFixed(1)} hours remaining`,
        hoursUntil: hoursUntilPickup
      };
    }

    return {
      canCancel: true,
      reason: 'Pickup can be cancelled',
      hoursUntil: Math.round(hoursUntilPickup)
    };
  }

  /**
   * Process pickup cancellation with validation
   * @param {Object} pickup - The pickup object
   * @param {string} userID - ID of user cancelling
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Result of cancellation attempt
   */
  static async processCancellation(pickup, userID, reason) {
    // Validate cancellation eligibility
    const eligibility = this.canCancelPickup(pickup);
    
    if (!eligibility.canCancel) {
      throw new Error(eligibility.reason);
    }

    // Check if user is authorized to cancel
    if (pickup.giverID !== userID && pickup.collectorID !== userID) {
      throw new Error('You are not authorized to cancel this pickup');
    }

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      throw new Error('Please provide a detailed cancellation reason (at least 10 characters)');
    }

    // Determine impact on reputation
    const reputationImpact = this.calculateReputationImpact(pickup, eligibility.hoursUntil);

    // Process the cancellation
    const cancellationData = {
      status: 'Cancelled',
      cancelledAt: new Date(),
      cancelledBy: userID,
      cancellationReason: reason.trim(),
      hoursBeforePickup: eligibility.hoursUntil,
      reputationImpact: reputationImpact
    };

    // Update pickup status in database
    await this.updatePickupStatus(pickup.pickupID, cancellationData);

    // Send notifications
    await this.sendCancellationNotifications(pickup, userID, reason, eligibility.hoursUntil);

    // Update post status if needed
    if (pickup.postType === 'Waste' && pickup.status === 'Confirmed') {
      await this.revertPostStatus(pickup.postID);
    }

    return {
      success: true,
      message: 'Pickup cancelled successfully',
      reputationImpact: reputationImpact,
      data: cancellationData
    };
  }

  /**
   * Calculate reputation impact based on cancellation timing
   * @param {Object} pickup - The pickup object
   * @param {number} hoursUntil - Hours until pickup
   * @returns {number} - Reputation points to deduct
   */
  static calculateReputationImpact(pickup, hoursUntil) {
    // No penalty for proposed pickups
    if (pickup.status === 'Proposed') {
      return 0;
    }

    // Sliding scale penalty for confirmed pickups
    if (hoursUntil >= 24) {
      return 0; // No penalty if cancelled 24+ hours before
    } else if (hoursUntil >= 12) {
      return 5; // Minor penalty
    } else if (hoursUntil >= 5) {
      return 10; // Moderate penalty
    } else {
      return 20; // This shouldn't happen due to 5-hour rule, but included for completeness
    }
  }

  /**
   * Send notifications about the cancellation
   */
  static async sendCancellationNotifications(pickup, cancellerID, reason, hoursUntil) {
    const Message = require('../models/Message');
    const Notification = require('../models/Notification');
    
    const otherUserID = cancellerID === pickup.giverID ? pickup.collectorID : pickup.giverID;
    const cancellerRole = cancellerID === pickup.giverID ? 'Giver' : 'Collector';
    
    // Create system message in chat
    await Message.create({
      senderID: 'system',
      receiverID: otherUserID,
      postID: pickup.postID,
      messageType: 'system',
      message: `Pickup cancelled by ${cancellerRole}. Reason: ${reason}`,
      metadata: {
        action: 'pickup_cancelled',
        pickupID: pickup.pickupID,
        cancelledBy: cancellerRole,
        hoursBeforePickup: hoursUntil
      }
    });

    // Create notification
    await Notification.create({
      userID: otherUserID,
      type: 'Pickup_Cancelled',
      title: 'Pickup Cancelled',
      message: `Your pickup for "${pickup.postTitle}" scheduled on ${pickup.pickupDate} at ${pickup.pickupTime} has been cancelled`,
      referenceID: pickup.pickupID,
      metadata: {
        reason: reason,
        cancelledBy: cancellerRole,
        hoursNotice: hoursUntil
      }
    });
  }

  /**
   * Update pickup status in database
   */
  static async updatePickupStatus(pickupID, cancellationData) {
    const Pickup = require('../models/Pickup');
    const pickup = await Pickup.findById(pickupID);
    await pickup.update(cancellationData);
  }

  /**
   * Revert post status when pickup is cancelled
   */
  static async revertPostStatus(postID) {
    const Post = require('../models/Posts');
    await Post.updateStatus(postID, 'Available');
  }

  /**
   * Get cancellation deadline for a pickup
   * @param {Object} pickup - The pickup object
   * @returns {Date} - The deadline for cancellation
   */
  static getCancellationDeadline(pickup) {
    const pickupDateTime = new Date(`${pickup.pickupDate}T${pickup.pickupTime}`);
    const deadlineTime = new Date(pickupDateTime.getTime() - (5 * 60 * 60 * 1000)); // 5 hours before
    return deadlineTime;
  }

  /**
   * Format time remaining message
   * @param {number} hoursUntil - Hours until pickup
   * @returns {string} - Formatted message
   */
  static formatTimeRemaining(hoursUntil) {
    if (hoursUntil < 0) {
      return 'Pickup time has passed';
    } else if (hoursUntil < 1) {
      const minutes = Math.round(hoursUntil * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} until pickup`;
    } else if (hoursUntil < 24) {
      const hours = Math.round(hoursUntil);
      return `${hours} hour${hours !== 1 ? 's' : ''} until pickup`;
    } else {
      const days = Math.round(hoursUntil / 24);
      return `${days} day${days !== 1 ? 's' : ''} until pickup`;
    }
  }

  /**
   * Check if user has excessive cancellations
   * @param {string} userID - The user ID to check
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} - Cancellation statistics
   */
  static async getUserCancellationStats(userID, days = 30) {
    const Pickup = require('../models/Pickup');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Get user's pickups
    const pickups = await Pickup.findByUser(userID, 'both');
    
    // Filter pickups within the timeframe
    const recentPickups = pickups.filter(p => p.createdAt >= cutoffDate);
    
    // Calculate statistics
    const stats = {
      total: recentPickups.length,
      completed: recentPickups.filter(p => p.status === 'Completed').length,
      cancelled: recentPickups.filter(p => p.status === 'Cancelled').length,
      cancelledByUser: recentPickups.filter(p => 
        p.status === 'Cancelled' && p.cancelledBy === userID
      ).length,
      cancellationRate: 0
    };
    
    // Calculate cancellation rate
    if (stats.total > 0) {
      stats.cancellationRate = (stats.cancelledByUser / stats.total) * 100;
    }
    
    // Determine if user has excessive cancellations
    stats.hasExcessiveCancellations = stats.cancellationRate > 20 || stats.cancelledByUser > 5;
    
    return stats;
  }

  /**
   * Send reminder notifications for upcoming pickups
   * @param {Object} pickup - The pickup object
   * @returns {Promise<void>}
   */
  static async sendPickupReminder(pickup) {
    const hoursUntil = (new Date(`${pickup.pickupDate}T${pickup.pickupTime}`) - new Date()) / (1000 * 60 * 60);
    
    // Send reminders at 24 hours and 2 hours before pickup
    if ((hoursUntil <= 24 && hoursUntil > 23) || (hoursUntil <= 2 && hoursUntil > 1)) {
      const Notification = require('../models/Notification');
      
      // Remind both parties
      const timeMessage = hoursUntil > 20 ? 'tomorrow' : 'in 2 hours';
      
      await Promise.all([
        Notification.create({
          userID: pickup.giverID,
          type: 'Pickup_Reminder',
          title: 'Upcoming Pickup',
          message: `Reminder: Pickup scheduled ${timeMessage} at ${pickup.pickupTime}`,
          referenceID: pickup.pickupID
        }),
        Notification.create({
          userID: pickup.collectorID,
          type: 'Pickup_Reminder',
          title: 'Upcoming Pickup',
          message: `Reminder: You have a pickup ${timeMessage} at ${pickup.pickupLocation}`,
          referenceID: pickup.pickupID
        })
      ]);
    }
  }
}

module.exports = PickupCancellationService;