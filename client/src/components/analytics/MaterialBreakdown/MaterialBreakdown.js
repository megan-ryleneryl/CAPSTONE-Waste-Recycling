// client/src/components/analytics/MaterialBreakdown/MaterialBreakdown.js
import React, { useState } from 'react';
import styles from './MaterialBreakdown.module.css';

const MaterialBreakdown = ({ material, onMaterialChange }) => {
  const [selectedMaterial, setSelectedMaterial] = useState(material.type);

  const materials = [
    { type: 'Plastic', subtype: 'Electronics Glass', color: '#4CAF50' },
    { type: 'Paper', subtype: 'Cardboard', color: '#2196F3' },
    { type: 'Glass', subtype: 'Bottles', color: '#FF9800' },
    { type: 'Metal', subtype: 'Aluminum Cans', color: '#9C27B0' }
  ];

  const handleMaterialClick = (materialType) => {
    setSelectedMaterial(materialType);
    if (onMaterialChange) {
      onMaterialChange(materialType);
    }
  };

  const currentMaterial = materials.find(m => m.type === selectedMaterial) || materials[0];

  return (
    <div className={styles.materialCard}>
      <h4 className={styles.materialTitle}>Top Material</h4>
      
      <div className={styles.materialDisplay}>
        <div 
          className={styles.materialMain}
          style={{ borderColor: currentMaterial.color }}
        >
          <div className={styles.materialType}>
            {currentMaterial.type}
          </div>
          <div className={styles.materialSubtype}>
            {currentMaterial.subtype}
          </div>
        </div>
      </div>

      <div className={styles.materialSelector}>
        {materials.map((mat) => (
          <button
            key={mat.type}
            className={`${styles.materialButton} ${
              selectedMaterial === mat.type ? styles.active : ''
            }`}
            onClick={() => handleMaterialClick(mat.type)}
            style={{ 
              backgroundColor: selectedMaterial === mat.type ? mat.color : 'transparent',
              borderColor: mat.color 
            }}
          >
            {mat.type}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MaterialBreakdown;