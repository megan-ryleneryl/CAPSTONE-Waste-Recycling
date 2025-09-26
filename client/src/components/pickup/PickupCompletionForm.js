// client/src/components/pickup/PickupCompletionForm.js
import React, { useState } from 'react';
import { Check, Package, DollarSign, Shield, Camera, AlertCircle } from 'lucide-react';
import styles from './PickupCompletionForm.module.css';

const PickupCompletionForm = ({ pickup, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Verify Identity
    identityVerified: false,
    verificationMethod: '',
    
    // Step 2: Actual Waste Details
    actualWaste: {
      types: pickup.expectedWaste?.types || [],
      finalAmount: pickup.expectedWaste?.estimatedAmount || 0,
      unit: pickup.expectedWaste?.unit || 'kg',
      notes: ''
    },
    
    // Step 3: Payment Details
    paymentReceived: 0,
    paymentMethod: '',
    
    // Step 4: Final Notes
    completionNotes: '',
    rating: 0,
    wouldRecommend: null
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const verificationMethods = [
    { value: 'government_id', label: 'Government ID shown' },
    { value: 'app_verification', label: 'Verified through app' },
    { value: 'known_person', label: 'Known person' },
    { value: 'other', label: 'Other method' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'gcash', label: 'GCash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'none', label: 'No payment' }
  ];

  const validateStep = () => {
    const newErrors = {};
    
    switch(step) {
      case 1:
        if (!formData.identityVerified) {
          newErrors.identity = 'Please confirm identity verification';
        }
        if (!formData.verificationMethod) {
          newErrors.verificationMethod = 'Please select verification method';
        }
        break;
        
      case 2:
        if (formData.actualWaste.finalAmount <= 0) {
          newErrors.amount = 'Please enter the actual amount collected';
        }
        if (formData.actualWaste.types.length === 0) {
          newErrors.types = 'Please select at least one waste type';
        }
        break;
        
      case 3:
        if (formData.paymentReceived < 0) {
          newErrors.payment = 'Payment amount cannot be negative';
        }
        if (formData.paymentReceived > 0 && !formData.paymentMethod) {
          newErrors.paymentMethod = 'Please select payment method';
        }
        break;
        
      case 4:
        if (formData.rating === 0) {
          newErrors.rating = 'Please rate your experience';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleComplete = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    try {
      await onComplete(pickup.pickupID, formData);
    } catch (error) {
      console.error('Error completing pickup:', error);
      alert('Failed to complete pickup. Please try again.');
    }
    setLoading(false);
  };

  const updateWasteType = (type, checked) => {
    const types = checked 
      ? [...formData.actualWaste.types, type]
      : formData.actualWaste.types.filter(t => t !== type);
    
    setFormData({
      ...formData,
      actualWaste: {
        ...formData.actualWaste,
        types
      }
    });
  };

  const wasteTypes = ['Plastic', 'Paper', 'Metal', 'Glass', 'E-waste', 'Organic', 'Other'];

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressSteps}>
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s} 
                className={`${styles.step} ${s <= step ? styles.active : ''} ${s < step ? styles.completed : ''}`}
              >
                <div className={styles.stepNumber}>{s}</div>
                <span className={styles.stepLabel}>
                  {s === 1 && 'Verify'}
                  {s === 2 && 'Waste'}
                  {s === 3 && 'Payment'}
                  {s === 4 && 'Review'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Title */}
        <div className={styles.header}>
          <h2>Complete Pickup</h2>
          <p className={styles.pickupInfo}>
            {pickup.postTitle} • {pickup.collectorName}
          </p>
        </div>

        {/* Step 1: Identity Verification */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h3>
              <Shield className={styles.stepIcon} />
              Identity Verification
            </h3>
            <p className={styles.stepDescription}>
              Confirm that the collector's identity has been verified
            </p>

            <div className={styles.verificationCheck}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formData.identityVerified}
                  onChange={(e) => setFormData({
                    ...formData, 
                    identityVerified: e.target.checked
                  })}
                />
                <span>I confirm that the collector showed proper identification</span>
              </label>
              {errors.identity && (
                <p className={styles.error}>{errors.identity}</p>
              )}
            </div>

            <div className={styles.field}>
              <label>Verification Method:</label>
              <div className={styles.radioGroup}>
                {verificationMethods.map((method) => (
                  <label key={method.value} className={styles.radio}>
                    <input
                      type="radio"
                      name="verificationMethod"
                      value={method.value}
                      checked={formData.verificationMethod === method.value}
                      onChange={(e) => setFormData({
                        ...formData,
                        verificationMethod: e.target.value
                      })}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
              {errors.verificationMethod && (
                <p className={styles.error}>{errors.verificationMethod}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Actual Waste Details */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h3>
              <Package className={styles.stepIcon} />
              Actual Waste Collected
            </h3>
            <p className={styles.stepDescription}>
              Enter the actual details of waste collected
            </p>

            <div className={styles.field}>
              <label>Waste Types Collected:</label>
              <div className={styles.checkboxGroup}>
                {wasteTypes.map((type) => (
                  <label key={type} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.actualWaste.types.includes(type)}
                      onChange={(e) => updateWasteType(type, e.target.checked)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              {errors.types && (
                <p className={styles.error}>{errors.types}</p>
              )}
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Actual Amount:</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.actualWaste.finalAmount}
                  onChange={(e) => setFormData({
                    ...formData,
                    actualWaste: {
                      ...formData.actualWaste,
                      finalAmount: parseFloat(e.target.value) || 0
                    }
                  })}
                  className={styles.input}
                />
                {errors.amount && (
                  <p className={styles.error}>{errors.amount}</p>
                )}
              </div>

              <div className={styles.field}>
                <label>Unit:</label>
                <select
                  value={formData.actualWaste.unit}
                  onChange={(e) => setFormData({
                    ...formData,
                    actualWaste: {
                      ...formData.actualWaste,
                      unit: e.target.value
                    }
                  })}
                  className={styles.select}
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lbs">Pounds (lbs)</option>
                  <option value="pieces">Pieces</option>
                  <option value="bags">Bags</option>
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label>Notes about waste condition (optional):</label>
              <textarea
                value={formData.actualWaste.notes}
                onChange={(e) => setFormData({
                  ...formData,
                  actualWaste: {
                    ...formData.actualWaste,
                    notes: e.target.value
                  }
                })}
                rows="3"
                className={styles.textarea}
                placeholder="e.g., Clean and sorted, mixed materials, etc."
              />
            </div>
          </div>
        )}

        {/* Step 3: Payment Details */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h3>
              <DollarSign className={styles.stepIcon} />
              Payment Details
            </h3>
            <p className={styles.stepDescription}>
              Record any payment received for the waste
            </p>

            <div className={styles.field}>
              <label>Payment Amount (₱):</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.paymentReceived}
                onChange={(e) => setFormData({
                  ...formData,
                  paymentReceived: parseFloat(e.target.value) || 0
                })}
                className={styles.input}
                placeholder="0.00"
              />
              {errors.payment && (
                <p className={styles.error}>{errors.payment}</p>
              )}
            </div>

            {formData.paymentReceived > 0 && (
              <div className={styles.field}>
                <label>Payment Method:</label>
                <div className={styles.radioGroup}>
                  {paymentMethods.map((method) => (
                    <label key={method.value} className={styles.radio}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={formData.paymentMethod === method.value}
                        onChange={(e) => setFormData({
                          ...formData,
                          paymentMethod: e.target.value
                        })}
                      />
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
                {errors.paymentMethod && (
                  <p className={styles.error}>{errors.paymentMethod}</p>
                )}
              </div>
            )}

            <div className={styles.paymentSummary}>
              <AlertCircle className={styles.infoIcon} />
              <p>
                {formData.paymentReceived > 0 
                  ? `Total payment: ₱${formData.paymentReceived.toFixed(2)}`
                  : 'No payment for this pickup'}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Final Review */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <h3>
              <Check className={styles.stepIcon} />
              Final Review
            </h3>
            <p className={styles.stepDescription}>
              Rate your experience and add any final notes
            </p>

            <div className={styles.field}>
              <label>Rate your experience:</label>
              <div className={styles.rating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({...formData, rating: star})}
                    className={`${styles.star} ${star <= formData.rating ? styles.filled : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {errors.rating && (
                <p className={styles.error}>{errors.rating}</p>
              )}
            </div>

            <div className={styles.field}>
              <label>Would you recommend this collector?</label>
              <div className={styles.recommendOptions}>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, wouldRecommend: true})}
                  className={`${styles.recommendBtn} ${formData.wouldRecommend === true ? styles.active : ''}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, wouldRecommend: false})}
                  className={`${styles.recommendBtn} ${formData.wouldRecommend === false ? styles.active : ''}`}
                >
                  No
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label>Additional notes (optional):</label>
              <textarea
                value={formData.completionNotes}
                onChange={(e) => setFormData({
                  ...formData,
                  completionNotes: e.target.value
                })}
                rows="4"
                className={styles.textarea}
                placeholder="Any feedback or comments about the pickup..."
              />
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              <h4>Pickup Summary</h4>
              <div className={styles.summaryItem}>
                <span>Identity Verified:</span>
                <span>{formData.identityVerified ? 'Yes' : 'No'}</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Waste Collected:</span>
                <span>{formData.actualWaste.finalAmount} {formData.actualWaste.unit}</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Types:</span>
                <span>{formData.actualWaste.types.join(', ')}</span>
              </div>
              <div className={styles.summaryItem}>
                <span>Payment:</span>
                <span>₱{formData.paymentReceived.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className={styles.backBtn}
            >
              Back
            </button>
          )}
          
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className={styles.nextBtn}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className={styles.completeBtn}
            >
              {loading ? 'Completing...' : 'Complete Pickup'}
            </button>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );