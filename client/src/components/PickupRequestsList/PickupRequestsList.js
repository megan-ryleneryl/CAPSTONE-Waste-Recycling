import React, { useState, useEffect } from 'react';
import './PickupRequestsList.module.css';

const PickupRequestsList = ({ postID, postTitle, onRequestAccepted }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    fetchPickupRequests();
  }, [postID]);

  const fetchPickupRequests = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/messages/conversations?postID=${postID}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter conversations that are pickup requests for this post
        const pickupRequests = data.data?.filter(conv => 
          conv.postID === postID && conv.lastMessage
        ) || [];
        setRequests(pickupRequests);
      }
    } catch (error) {
      console.error('Error fetching pickup requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (conversation) => {
    setProcessingRequest(conversation.conversationID);
    
    try {
      // Navigate to chat to continue the conversation
      window.location.href = `/chat?postId=${postID}&userId=${conversation.otherParticipantID}`;
    } catch (error) {
      console.error('Error accepting request:', error);
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (conversation) => {
    setProcessingRequest(conversation.conversationID);
    
    try {
      // Send a decline message
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/messages/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            receiverID: conversation.otherParticipantID,
            postID: postID,
            message: "Thank you for your interest, but I've decided to go with another collector for this pickup."
          })
        }
      );

      if (response.ok) {
        // Remove from list
        setRequests(prev => prev.filter(r => r.conversationID !== conversation.conversationID));
      }
    } catch (error) {
      console.error('Error declining request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  if (loading) {
    return (
      <div className="requests-list-container">
        <div className="loading">Loading pickup requests...</div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="requests-list-container">
        <div className="no-requests">
          <h3>No Pickup Requests Yet</h3>
          <p>When collectors request to pick up your recyclables, they'll appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="requests-list-container">
      <div className="requests-header">
        <h2>Pickup Requests ({requests.length})</h2>
        <p className="post-title">For: {postTitle}</p>
      </div>

      <div className="requests-list">
        {requests.map((request) => (
          <div key={request.conversationID} className="request-card">
            <div className="request-header">
              <div className="collector-info">
                <div className="collector-avatar">
                  {request.otherParticipant?.firstName?.[0] || 'C'}
                </div>
                <div className="collector-details">
                  <h4>{request.otherParticipant?.firstName} {request.otherParticipant?.lastName}</h4>
                  <span className="collector-type">
                    {request.otherParticipant?.isCollector ? '✓ Verified Collector' : 'Collector'}
                  </span>
                </div>
              </div>
              <div className="request-time">
                {new Date(request.lastMessageTime).toLocaleDateString()}
              </div>
            </div>

            <div className="request-message">
              <p>{request.lastMessage}</p>
            </div>

            {request.otherParticipant?.rating && (
              <div className="collector-rating">
                <span className="rating-stars">
                  {'★'.repeat(Math.round(request.otherParticipant.rating))}
                  {'☆'.repeat(5 - Math.round(request.otherParticipant.rating))}
                </span>
                <span className="rating-text">
                  {request.otherParticipant.rating.toFixed(1)} rating
                </span>
              </div>
            )}

            <div className="request-actions">
              <button
                className="accept-btn"
                onClick={() => handleAcceptRequest(request)}
                disabled={processingRequest === request.conversationID}
              >
                {processingRequest === request.conversationID ? 'Processing...' : 'Accept & Chat'}
              </button>
              <button
                className="decline-btn"
                onClick={() => handleDeclineRequest(request)}
                disabled={processingRequest === request.conversationID}
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PickupRequestsList;