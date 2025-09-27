import React, { useState } from 'react';
import './RequestPickupModal.module.css';

const RequestPickupModal = ({ isOpen, onClose, onSubmit, postTitle, giverName }) => {
  const [message, setMessage] = useState(
    "Hi, I'm interested in collecting your recyclables. When would be a good time for me to pick them up?"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(message);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send request');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Pickup</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="post-info">
            <p className="info-label">Requesting pickup for:</p>
            <p className="post-title">{postTitle}</p>
            {giverName && (
              <p className="giver-name">From: {giverName}</p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="message">Your message to the giver:</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself and propose a pickup time..."
                rows="6"
                className={error ? 'error' : ''}
                disabled={isSubmitting}
              />
              {error && <span className="error-message">{error}</span>}
            </div>

            <div className="message-tips">
              <p className="tips-title">💡 Tips for a successful request:</p>
              <ul>
                <li>Introduce yourself briefly</li>
                <li>Mention your availability</li>
                <li>Be specific about pickup times</li>
                <li>Include your contact preference</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestPickupModal;