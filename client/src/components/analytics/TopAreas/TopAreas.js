// client/src/components/analytics/TopAreas/TopAreas.js
import React from 'react';
import styles from './TopAreas.module.css';

const TopAreas = ({ areas }) => {
  const maxCount = Math.max(...areas.map(area => area.count));

  return (
    <div className={styles.areasCard}>
      <h4 className={styles.areasTitle}>Top Areas</h4>
      
      <div className={styles.areasList}>
        {areas.map((area, index) => (
          <div key={area.area} className={styles.areaItem}>
            <span className={styles.areaName}>{area.area}</span>
            <div className={styles.progressContainer}>
              <div 
                className={styles.progressBar}
                style={{ 
                  width: `${(area.count / maxCount) * 100}%`,
                  backgroundColor: getAreaColor(index)
                }}
              />
            </div>
            <span className={styles.areaCount}>{area.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const getAreaColor = (index) => {
  const colors = ['#4CAF50', '#2196F3', '#FF9800'];
  return colors[index] || '#9E9E9E';
};

export default TopAreas;