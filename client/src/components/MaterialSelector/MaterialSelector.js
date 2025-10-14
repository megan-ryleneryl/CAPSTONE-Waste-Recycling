// client/src/components/MaterialSelector/MaterialSelector.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import styles from './MaterialSelector.module.css';

const MaterialSelector = ({ selectedMaterials, onChange }) => {
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/materials');
      if (response.data.success) {
        setAvailableMaterials(response.data.materials);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = () => {
    const newMaterial = {
      materialID: '',
      quantity: '',
      unit: 'kg' // Always default to kg
    };
    onChange([...selectedMaterials, newMaterial]);
  };

  const removeMaterial = (index) => {
    const updated = selectedMaterials.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...selectedMaterials];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  if (loading) {
    return <div className={styles.loading}>Loading materials...</div>;
  }

  return (
    <div className={styles.materialSelector}>
      <div className={styles.header}>
        <label className={styles.label}>Materials *</label>
        <button
          type="button"
          onClick={addMaterial}
          className={styles.addButton}
        >
          <Plus size={16} /> Add Material
        </button>
      </div>

      {selectedMaterials.length === 0 && (
        <p className={styles.emptyState}>
          Click "Add Material" to select materials and quantities
        </p>
      )}

      {selectedMaterials.map((item, index) => {
        const selectedMaterial = availableMaterials.find(
          m => m.materialID === item.materialID
        );

        return (
          <div key={index} className={styles.materialRow}>
            <div className={styles.selectWrapper}>
              <select
                value={item.materialID}
                onChange={(e) => updateMaterial(index, 'materialID', e.target.value)}
                className={styles.select}
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

            <div className={styles.quantityWrapper}>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                placeholder="Quantity (kg)"
                className={styles.quantityInput}
                min="0"
                step="1"
                required
              />
              <span className={styles.unitLabel}>kg</span>
            </div>

            <button
              type="button"
              onClick={() => removeMaterial(index)}
              className={styles.removeButton}
              aria-label="Remove material"
            >
              <Trash2 size={16} />
            </button>

            {selectedMaterial && item.quantity && (
              <div className={styles.priceInfo}>
                <span className={styles.pricePerKg}>₱{selectedMaterial.averagePricePerKg}/kg</span>
                <span className={styles.priceEstimate}>
                  Est: ₱{(parseFloat(item.quantity || 0) * selectedMaterial.averagePricePerKg).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {selectedMaterials.length > 0 && (
        <div className={styles.totalEstimate}>
          <strong>Total Estimate: </strong>
          ₱{selectedMaterials.reduce((total, item) => {
            const material = availableMaterials.find(m => m.materialID === item.materialID);
            if (material && item.quantity) {
              return total + (parseFloat(item.quantity) * material.averagePricePerKg);
            }
            return total;
          }, 0).toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default MaterialSelector;