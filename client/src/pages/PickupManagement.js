import React, { useState, useEffect } from 'react';

const PickupManagement = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Mock user data - in real app would come from context
  const currentUser = {
    userID: 'user123',
    userType: 'Collector',
    name: 'John Doe'
  };

  useEffect(() => {
    fetchPickups();
  }, [activeTab]);

  const fetchPickups = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Mock data - would come from API
      const mockPickups = [
        {
          pickupID: 'p1',
          postID: 'post1',
          postTitle: '50kg Plastic Bottles for Recycling',
          postType: 'Waste',
          giverName: 'Alice Smith',
          collectorName: 'John Doe',
          status: 'Confirmed',
          pickupDate: '2024-12-20',
          pickupTime: '10:00 AM',
          pickupLocation: '123 Green Street, Eco City',
          contactPerson: 'Alice',
          contactNumber: '555-0123',
          expectedWaste: {
            types: ['Plastic Bottles'],
            estimatedAmount: 50,
            unit: 'kg'
          }
        },
        {
          pickupID: 'p2',
          postID: 'post2',
          postTitle: 'Community Garden Project',
          postType: 'Initiative',
          giverName: 'Bob Johnson',
          collectorName: 'Green Initiative Org',
          status: 'Proposed',
          pickupDate: '2024-12-22',
          pickupTime: '2:00 PM',
          pickupLocation: '456 Park Avenue, Eco City',
          contactPerson: 'Bob',
          contactNumber: '555-0456',
          expectedWaste: {
            types: ['Organic Waste', 'Compost'],
            estimatedAmount: 30,
            unit: 'kg'
          }
        },
        {
          pickupID: 'p3',
          postID: 'post3',
          postTitle: 'Office Electronics Disposal',
          postType: 'Waste',
          giverName: 'Tech Corp',
          collectorName: 'John Doe',
          status: 'Completed',
          pickupDate: '2024-12-15',
          pickupTime: '3:00 PM',
          pickupLocation: '789 Tech Plaza, Eco City',
          actualWaste: {
            types: ['Electronics'],
            finalAmount: 25,
            unit: 'units'
          },
          paymentReceived: 150,
          completionNotes: 'All items collected successfully'
        }
      ];

      // Filter based on active tab
      let filtered = mockPickups;
      switch(activeTab) {
        case 'upcoming':
          filtered = mockPickups.filter(p => 
            ['Proposed', 'Confirmed'].includes(p.status)
          );
          break;
        case 'active':
          filtered = mockPickups.filter(p => 
            p.status === 'In-Progress'
          );
          break;
        case 'completed':
          filtered = mockPickups.filter(p => 
            p.status === 'Completed'
          );
          break;
        case 'all':
        default:
          break;
      }
      
      setPickups(filtered);
      setLoading(false);
    }, 1000);
  };

  const handleConfirmPickup = (pickupID) => {
    alert(`Confirming pickup ${pickupID}`);
    // In real app, would make API call
    fetchPickups();
  };

  const handleCancelPickup = (pickupID) => {
    if (window.confirm('Are you sure you want to cancel this pickup?')) {
      alert(`Cancelling pickup ${pickupID}`);
      // In real app, would make API call
      fetchPickups();
    }
  };

  const handleCompletePickup = (pickup) => {
    setSelectedPickup(pickup);
    setShowScheduleModal(true);
  };

  const submitCompletion = () => {
    alert('Pickup marked as complete!');
    setShowScheduleModal(false);
    fetchPickups();
  };

  const getStatusColor = (status) => {
    const colors = {
      'Proposed': '#f59e0b',
      'Confirmed': '#10b981',
      'In-Progress': '#3b82f6',
      'Completed': '#6b7280',
      'Cancelled': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const canCancelPickup = (pickup) => {
    // Can cancel if more than 5 hours before pickup
    const pickupDateTime = new Date(`${pickup.pickupDate} ${pickup.pickupTime}`);
    const now = new Date();
    const hoursUntilPickup = (pickupDateTime - now) / (1000 * 60 * 60);
    return hoursUntilPickup > 5 && ['Proposed', 'Confirmed'].includes(pickup.status);
  };

  return (
    <div className="pickup-management">
      <div className="header">
        <h1>Pickup Management</h1>
        <p>Track and manage your waste pickups</p>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button 
          className={activeTab === 'upcoming' ? 'active' : ''}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        <button 
          className={activeTab === 'active' ? 'active' : ''}
          onClick={() => setActiveTab('active')}
        >
          In Progress
        </button>
        <button 
          className={activeTab === 'completed' ? 'active' : ''}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
        <button 
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Pickups
        </button>
      </div>

      {/* Pickups List */}
      <div className="pickups-container">
        {loading ? (
          <div className="loading">Loading pickups...</div>
        ) : pickups.length === 0 ? (
          <div className="empty">
            <p>No pickups found in this category</p>
          </div>
        ) : (
          pickups.map(pickup => (
            <div key={pickup.pickupID} className="pickup-card">
              <div className="pickup-header">
                <div className="pickup-title">
                  <h3>{pickup.postTitle}</h3>
                  <span className="post-type">{pickup.postType}</span>
                </div>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(pickup.status) }}
                >
                  {pickup.status}
                </span>
              </div>

              <div className="pickup-details">
                <div className="detail-row">
                  <span className="label">📅 Date:</span>
                  <span>{pickup.pickupDate}</span>
                </div>
                <div className="detail-row">
                  <span className="label">⏰ Time:</span>
                  <span>{pickup.pickupTime}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📍 Location:</span>
                  <span>{pickup.pickupLocation}</span>
                </div>
                <div className="detail-row">
                  <span className="label">👤 Contact:</span>
                  <span>{pickup.contactPerson} ({pickup.contactNumber})</span>
                </div>
                
                {pickup.expectedWaste && (
                  <div className="detail-row">
                    <span className="label">📦 Expected:</span>
                    <span>
                      {pickup.expectedWaste.types.join(', ')} - 
                      {pickup.expectedWaste.estimatedAmount} {pickup.expectedWaste.unit}
                    </span>
                  </div>
                )}

                {pickup.actualWaste && (
                  <div className="detail-row">
                    <span className="label">✅ Collected:</span>
                    <span>
                      {pickup.actualWaste.types.join(', ')} - 
                      {pickup.actualWaste.finalAmount} {pickup.actualWaste.unit}
                    </span>
                  </div>
                )}

                {pickup.paymentReceived && (
                  <div className="detail-row">
                    <span className="label">💰 Payment:</span>
                    <span>₱{pickup.paymentReceived}</span>
                  </div>
                )}
              </div>

              <div className="pickup-actions">
                {pickup.status === 'Proposed' && currentUser.userType === 'Giver' && (
                  <button 
                    className="btn-confirm"
                    onClick={() => handleConfirmPickup(pickup.pickupID)}
                  >
                    Confirm Pickup
                  </button>
                )}

                {pickup.status === 'Confirmed' && currentUser.userType === 'Collector' && (
                  <button className="btn-start">
                    Start Pickup
                  </button>
                )}

                {pickup.status === 'In-Progress' && currentUser.userType === 'Giver' && (
                  <button 
                    className="btn-complete"
                    onClick={() => handleCompletePickup(pickup)}
                  >
                    Mark as Complete
                  </button>
                )}

                {canCancelPickup(pickup) && (
                  <button 
                    className="btn-cancel"
                    onClick={() => handleCancelPickup(pickup.pickupID)}
                  >
                    Cancel Pickup
                  </button>
                )}

                <button className="btn-chat">
                  Open Chat
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Completion Modal */}
      {showScheduleModal && selectedPickup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Complete Pickup</h3>
            <p>Please confirm the details of this pickup:</p>

            <div className="completion-form">
              <div className="form-group">
                <label>Actual Materials Collected:</label>
                <input 
                  type="text" 
                  placeholder="e.g., Plastic bottles, Paper"
                  defaultValue={selectedPickup.expectedWaste?.types.join(', ')}
                />
              </div>

              <div className="form-group">
                <label>Final Amount:</label>
                <div className="amount-input">
                  <input 
                    type="number" 
                    placeholder="Amount"
                    defaultValue={selectedPickup.expectedWaste?.estimatedAmount}
                  />
                  <select defaultValue={selectedPickup.expectedWaste?.unit}>
                    <option value="kg">kg</option>
                    <option value="units">units</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Payment Received (if any):</label>
                <input 
                  type="number" 
                  placeholder="₱ 0.00"
                />
              </div>

              <div className="form-group">
                <label>Identity Verified?</label>
                <div className="checkbox-group">
                  <input type="checkbox" id="identity-verified" />
                  <label htmlFor="identity-verified">
                    Collector showed proper identification
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Additional Notes (optional):</label>
                <textarea 
                  rows="3"
                  placeholder="Any additional comments about the pickup..."
                />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={submitCompletion}
              >
                Complete Pickup
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pickup-management {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 30px;
        }

        .header h1 {
          font-size: 28px;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .header p {
          color: #6b7280;
          font-size: 16px;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .tabs button {
          padding: 10px 20px;
          background: transparent;
          border: none;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px 8px 0 0;
        }

        .tabs button:hover {
          color: #1f2937;
          background: #f3f4f6;
        }

        .tabs button.active {
          color: #3b6535;
          background: #dcfce7;
          font-weight: 600;
        }

        .pickups-container {
          display: grid;
          gap: 20px;
        }

        .loading, .empty {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 12px;
        }

        .pickup-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: box-shadow 0.3s ease;
        }

        .pickup-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .pickup-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
        }

        .pickup-title h3 {
          font-size: 18px;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .post-type {
          display: inline-block;
          padding: 4px 10px;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge {
          padding: 6px 12px;
          color: white;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .pickup-details {
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .detail-row .label {
          width: 120px;
          color: #6b7280;
          font-weight: 500;
        }

        .detail-row span:last-child {
          color: #1f2937;
        }

        .pickup-actions {
          display: flex;
          gap: 10px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }

        .pickup-actions button {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .btn-confirm {
          background: #10b981;
          color: white;
        }

        .btn-confirm:hover {
          background: #059669;
        }

        .btn-start {
          background: #3b82f6;
          color: white;
        }

        .btn-start:hover {
          background: #2563eb;
        }

        .btn-complete {
          background: #8b5cf6;
          color: white;
        }

        .btn-complete:hover {
          background: #7c3aed;
        }

        .btn-cancel {
          background: #ef4444;
          color: white;
        }

        .btn-cancel:hover {
          background: #dc2626;
        }

        .btn-chat {
          background: #06b6d4;
          color: white;
        }

        .btn-chat:hover {
          background: #0891b2;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-content h3 {
          font-size: 20px;
          color: #1f2937;
          margin-bottom: 10px;
        }

        .modal-content p {
          color: #6b7280;
          margin-bottom: 20px;
        }

        .completion-form {
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          color: #374151;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .amount-input {
          display: flex;
          gap: 10px;
        }

        .amount-input input {
          flex: 1;
        }

        .amount-input select {
          width: 100px;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-group input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .checkbox-group label {
          margin: 0;
          font-weight: normal;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary {
          padding: 10px 20px;
          background: #3b6535;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          background: #2d4e29;
        }

        .btn-secondary {
          padding: 10px 20px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        @media (max-width: 768px) {
          .tabs {
            flex-wrap: wrap;
          }

          .pickup-header {
            flex-direction: column;
            gap: 10px;
          }

          .pickup-actions {
            flex-direction: column;
          }

          .pickup-actions button {
            width: 100%;
          }

          .modal-content {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
};

export default PickupManagement;