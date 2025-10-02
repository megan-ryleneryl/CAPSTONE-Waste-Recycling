// client/src/components/pickup/PickupCompletionModal.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './PickupCompletionModal.module.css';

const PickupCompletionModal = ({ pickup, onComplete, onCancel, loading }) => {
  const [wasteItems, setWasteItems] = useState([
    { type: '', amount: '', payment: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const wasteTypes = [
    'Plastic Bottles',
    'Glass Bottles',
    'Paper/Cardboard',
    'Metal/Aluminum',
    'E-Waste',
    'Mixed Recyclables',
    'Other'
  ];

  const handleAddItem = () => {
    setWasteItems([...wasteItems, { type: '', amount: '', payment: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (wasteItems.length > 1) {
      const newItems = wasteItems.filter((_, i) => i !== index);
      setWasteItems(newItems);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...wasteItems];
    newItems[index][field] = value;
    setWasteItems(newItems);
  };

  const calculateTotal = () => {
    return wasteItems.reduce((total, item) => {
      const payment = parseFloat(item.payment) || 0;
      return total + payment;
    }, 0);
  };

  const calculateTotalAmount = () => {
    return wasteItems.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  };

  const validateForm = () => {
    for (let item of wasteItems) {
      if (!item.type || !item.amount) {
        alert('Please fill in all waste type and amount fields');
        return false;
      }
      if (item.amount && isNaN(parseFloat(item.amount))) {
        alert('Please enter valid amounts');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const completionData = {
      wasteDetails: wasteItems.map(item => ({
        type: item.type,
        amount: parseFloat(item.amount) || 0,
        payment: parseFloat(item.payment) || 0
      })),
      totalAmount: calculateTotalAmount(),
      totalPayment: calculateTotal(),
      paymentMethod: paymentMethod,
      notes: notes,
      completedAt: new Date()
    };

    onComplete(completionData);
  };

  const modalContent = (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Complete Pickup</h2>
          <button className={styles.closeBtn} onClick={onCancel} disabled={loading}>
            ×
          </button>
        </div>

        <div className={styles.subtitle}>
          *This will mark the pickup as complete
        </div>

        <div className={styles.content}>
          <div className={styles.wasteItems}>
            {wasteItems.map((item, index) => (
              <div key={index} className={styles.wasteItem}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemNumber}>Item {index + 1}</span>
                  {wasteItems.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleRemoveItem(index)}
                      disabled={loading}
                    >
                      −
                    </button>
                  )}
                </div>
                
                <div className={styles.itemFields}>
                  <div className={styles.field}>
                    <label>Waste type:</label>
                    <select
                      value={item.type}
                      onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select type</option>
                      {wasteTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.field}>
                    <label>Amount (kg):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      placeholder="0.0"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className={styles.field}>
                    <label>Payment (₱):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.payment}
                      onChange={(e) => handleItemChange(index, 'payment', e.target.value)}
                      placeholder="0.00"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddItem}
              disabled={loading}
            >
              + Add Item
            </button>
          </div>

          <div className={styles.paymentSection}>
            <div className={styles.field}>
              <label>Payment Method:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank">Bank Transfer</option>
                <option value="none">No Payment</option>
              </select>
            </div>
          </div>

          <div className={styles.notesSection}>
            <label>Additional Notes (Optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about the pickup..."
              rows="3"
              disabled={loading}
            />
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Total Weight:</span>
              <strong>{calculateTotalAmount().toFixed(2)} kg</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Total Payment:</span>
              <strong>₱ {calculateTotal().toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.completeBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Completing...' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PickupCompletionModal;