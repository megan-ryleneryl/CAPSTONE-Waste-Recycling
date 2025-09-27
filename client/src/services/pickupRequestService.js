// services/pickupRequestService.js

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class PickupRequestService {
  // Get auth headers
  static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Claim a waste post (initiate pickup request)
  static async claimPost(postID) {
    try {
      const response = await fetch(`${API_URL}/posts/${postID}/claim`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim post');
      }

      return await response.json();
    } catch (error) {
      console.error('Error claiming post:', error);
      throw error;
    }
  }

  // Check if user has already claimed a post
  static async hasClaimedPost(postID, userID) {
    try {
      // Check through conversations to see if there's an existing claim
      const response = await fetch(`${API_URL}/messages/conversations`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Failed to fetch conversations');
        return false;
      }

      const data = await response.json();
      const conversations = data.data || [];
      
      // Check if there's a conversation for this post with this user
      return conversations.some(conv => 
        conv.postID === postID && 
        (conv.participant1ID === userID || conv.participant2ID === userID)
      );
    } catch (error) {
      console.error('Error checking claim status:', error);
      return false;
    }
  }

  // Get pickup requests for a post (for post owners)
  static async getPickupRequests(postID) {
    try {
      const response = await fetch(`${API_URL}/posts/${postID}/pickup-requests`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch pickup requests');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching pickup requests:', error);
      return [];
    }
  }

  // Accept a pickup request (for post owners)
  static async acceptPickupRequest(postID, collectorID) {
    try {
      const response = await fetch(`${API_URL}/posts/${postID}/accept-request`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ collectorID })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept pickup request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting pickup request:', error);
      throw error;
    }
  }

  // Decline a pickup request (for post owners)
  static async declinePickupRequest(postID, collectorID, reason) {
    try {
      const response = await fetch(`${API_URL}/posts/${postID}/decline-request`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ collectorID, reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline pickup request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error declining pickup request:', error);
      throw error;
    }
  }

  // Cancel a pickup request (for collectors)
  static async cancelPickupRequest(postID) {
    try {
      const response = await fetch(`${API_URL}/posts/${postID}/cancel-request`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel pickup request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error canceling pickup request:', error);
      throw error;
    }
  }
}

export default PickupRequestService;