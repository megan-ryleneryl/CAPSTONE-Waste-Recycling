// client/src/components/analytics/WasteChart/WasteChart.js
import React from 'react';
import styles from './WasteChart.module.css';

const WasteChart = ({ totalWaste, trends }) => {
  const formatWeight = (weight) => {
    return weight >= 1000 
      ? `${(weight / 1000).toFixed(1)}k kg`
      : `${weight} kg`;
  };

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Waste Recycled</h3>
      
      <div className={styles.chartMain}>
        <div className={styles.chartValue}>
          {formatWeight(totalWaste)}
        </div>
        <div className={styles.chartLabel}>
          of waste recycled
        </div>
      </div>

      {trends && trends.length > 0 && (
        <div className={styles.trendContainer}>
          {/* Add trend visualization here */}
          <div className={styles.trendLine}>
            {/* Simple trend indicators */}
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteChart;