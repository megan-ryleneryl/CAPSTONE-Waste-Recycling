// client/src/components/pickup/PickupCompletionModal.js
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import styles from './PickupCompletionModal.module.css';

const PickupCompletionModal = ({ pickup, onComplete, onCancel, loading }) => {
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Fetch available materials from database
  useEffect(() => {
    fetchMaterials();
  }, []);

  // Prefill with estimated materials from post
  useEffect(() => {
    if (pickup && pickup.postData && availableMaterials.length > 0) {
      prefillEstimatedMaterials();
    }
  }, [pickup, availableMaterials]);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get('${API_BASE_URL}/api/materials');
      if (response.data.success) {
        setAvailableMaterials(response.data.materials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const prefillEstimatedMaterials = () => {
    // Helper function to get proposed price for a material
    const getProposedPrice = (materialID) => {
      const proposedPriceEntry = pickup.proposedPrice?.find(p => p.materialID === materialID);
      return proposedPriceEntry?.proposedPricePerKilo || null;
    };

    // For Initiative support pickups, get materials from supportData
    if (pickup.supportData?.offeredMaterials) {
      const supportMaterials = pickup.supportData.offeredMaterials.filter(m => m.status === 'Accepted');

      if (supportMaterials.length > 0) {
        const prefilled = supportMaterials.map(material => {
          // Find the materialID from availableMaterials by matching the name
          const foundMaterial = availableMaterials.find(m =>
            (m.displayName || m.type).toLowerCase() === material.materialName.toLowerCase()
          );
          const materialID = foundMaterial?.materialID || material.materialID || '';
          const proposedPrice = getProposedPrice(materialID);

          return {
            materialID: materialID,
            materialName: material.materialName,
            quantity: material.quantity || '',
            pricePerKg: proposedPrice || foundMaterial?.averagePricePerKg || ''
          };
        });
        setMaterials(prefilled);
        return;
      }
    }

    // For Waste posts, get materials from pickup.postData
    const postMaterials = pickup.postData?.materials || [];

    if (Array.isArray(postMaterials) && postMaterials.length > 0) {
      const prefilled = postMaterials.map(material => {
        // Material can be object {materialID, materialName, quantity} or string
        if (typeof material === 'object' && material.materialID) {
          const foundMaterial = availableMaterials.find(m => m.materialID === material.materialID);
          const proposedPrice = getProposedPrice(material.materialID);

          return {
            materialID: material.materialID,
            materialName: material.materialName || material.materialID,
            quantity: material.quantity || '',
            pricePerKg: proposedPrice || foundMaterial?.averagePricePerKg || ''
          };
        } else {
          // If it's a string, try to find it in availableMaterials
          const foundMaterial = availableMaterials.find(m =>
            (m.displayName || m.type).toLowerCase() === material.toLowerCase()
          );
          const materialID = foundMaterial?.materialID || '';
          const proposedPrice = getProposedPrice(materialID);

          return {
            materialID: materialID,
            materialName: foundMaterial?.displayName || material,
            quantity: '',
            pricePerKg: proposedPrice || foundMaterial?.averagePricePerKg || ''
          };
        }
      });
      setMaterials(prefilled);
    } else {
      // No materials in post, start with empty form
      setMaterials([{ materialID: '', materialName: '', quantity: '', pricePerKg: '' }]);
    }
  };

  const addMaterial = () => {
    setMaterials([...materials, { materialID: '', materialName: '', quantity: '', pricePerKg: '' }]);
  };

  const removeMaterial = (index) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: value };

    // If updating materialID, also update materialName and pricePerKg
    if (field === 'materialID' && value) {
      const material = availableMaterials.find(m => m.materialID === value);
      if (material) {
        updated[index].materialName = material.displayName || material.type;
        updated[index].pricePerKg = material.averagePricePerKg || '';
      }
    }

    setMaterials(updated);
  };

  const calculateTotalWeight = () => {
    return materials.reduce((total, item) => {
      return total + (parseFloat(item.quantity) || 0);
    }, 0);
  };

  const calculateTotalPayment = () => {
    return materials.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const pricePerKg = parseFloat(item.pricePerKg) || 0;
      return total + (quantity * pricePerKg);
    }, 0);
  };

  const validateForm = () => {
    if (materials.length === 0) {
      alert('Please add at least one material');
      return false;
    }

    for (let i = 0; i < materials.length; i++) {
      const item = materials[i];
      if (!item.materialID) {
        alert(`Please select a material for item ${i + 1}`);
        return false;
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        alert(`Please enter a valid quantity for item ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const completionData = {
      wasteDetails: materials.map(item => ({
        materialID: item.materialID,
        materialName: item.materialName,
        quantity: parseFloat(item.quantity) || 0,
        pricePerKg: parseFloat(item.pricePerKg) || 0,
        payment: (parseFloat(item.quantity) || 0) * (parseFloat(item.pricePerKg) || 0)
      })),
      totalAmount: calculateTotalWeight(),
      totalPayment: calculateTotalPayment(),
      paymentMethod: paymentMethod,
      notes: notes,
      completedAt: new Date()
    };

    onComplete(completionData);
  };

  const modalContent = (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.header}>
            <h2 className={styles.title}>Complete Pickup</h2>
            <button className={styles.closeBtn} onClick={onCancel} disabled={loading}>
              ×
            </button>
          </div>

          {/* Important Notice */}
          <div className={styles.notice}>
            <AlertCircle size={18} />
            <p>
              The form has been prefilled with estimated quantities from the original post and prices from the pickup proposal.
              <strong> Please adjust to the actual materials and quantities collected.</strong>
            </p>
          </div>

          <div className={styles.content}>
            {/* Materials Section */}
            <div className={styles.materialsSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Materials Collected</h3>
                <button
                  type="button"
                  onClick={addMaterial}
                  className={styles.addButton}
                  disabled={loading || loadingMaterials}
                >
                  <Plus size={16} /> Add Material
                </button>
              </div>

              {loadingMaterials ? (
                <div className={styles.loadingMessage}>Loading materials...</div>
              ) : (
                <div className={styles.materialsList}>
                  {materials.map((item, index) => {
                    const selectedMaterial = availableMaterials.find(
                      m => m.materialID === item.materialID
                    );

                    return (
                      <div key={index} className={styles.materialRow}>
                        <div className={styles.rowHeader}>
                          <span className={styles.itemNumber}>Item {index + 1}</span>
                          {materials.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMaterial(index)}
                              className={styles.removeButton}
                              disabled={loading}
                              aria-label="Remove material"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className={styles.rowFields}>
                          {/* Material Selection */}
                          <div className={styles.field}>
                            <label>Material Type *</label>
                            <select
                              value={item.materialID}
                              onChange={(e) => updateMaterial(index, 'materialID', e.target.value)}
                              className={styles.select}
                              disabled={loading}
                              required
                            >
                              <option value="">Select Material</option>
                              {availableMaterials.map(material => (
                                <option key={material.materialID} value={material.materialID}>
                                  {material.displayName || material.type}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className={styles.field}>
                            <label>Quantity (kg) *</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                              placeholder="0.0"
                              className={styles.input}
                              min="0"
                              step="0.1"
                              disabled={loading}
                              required
                            />
                          </div>

                          {/* Price per kg */}
                          <div className={styles.field}>
                            <label>Price per kg (₱)</label>
                            <input
                              type="number"
                              value={item.pricePerKg}
                              onChange={(e) => updateMaterial(index, 'pricePerKg', e.target.value)}
                              placeholder="0.00"
                              className={styles.input}
                              min="0"
                              step="0.01"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        {/* Price Info */}
                        {item.quantity && item.pricePerKg && (
                          <div className={styles.priceInfo}>
                            {selectedMaterial && (
                              <span className={styles.priceLabel}>
                                Market Avg: ₱{selectedMaterial.averagePricePerKg.toFixed(2)}/kg
                              </span>
                            )}
                            <span className={styles.priceEstimate}>
                              Total Payment: ₱{(parseFloat(item.quantity || 0) * parseFloat(item.pricePerKg || 0)).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className={styles.paymentSection}>
              <h3 className={styles.sectionTitle}>Payment Details</h3>
              <div className={styles.field}>
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={styles.select}
                  disabled={loading}
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="none">No Payment</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className={styles.notesSection}>
              <label>Additional Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information about the pickup..."
                rows="3"
                className={styles.textarea}
                disabled={loading}
              />
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Total Weight:</span>
                <strong>{calculateTotalWeight().toFixed(2)} kg</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Payment:</span>
                <strong>₱ {calculateTotalPayment().toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.completeButton}
              onClick={handleSubmit}
              disabled={loading || loadingMaterials}
            >
              {loading ? 'Completing...' : 'Complete Pickup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PickupCompletionModal;
