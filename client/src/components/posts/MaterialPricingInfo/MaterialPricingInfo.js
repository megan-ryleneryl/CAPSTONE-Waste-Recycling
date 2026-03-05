// components/posts/MaterialPricingInfo/MaterialPricingInfo.js
// Shows average and max pricing info for selected materials in CreatePost
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import styles from './MaterialPricingInfo.module.css';

const MaterialPricingInfo = ({ selectedMaterials, pricingData }) => {
  if (!selectedMaterials || selectedMaterials.length === 0 || !pricingData) {
    return null;
  }

  // Match selected materials to their pricing data
  const materialsWithPricing = selectedMaterials
    .map(mat => {
      const pricing = pricingData.find(p => p.materialID === mat.materialID);
      if (!pricing) return null;
      return {
        ...mat,
        basePricePerKg: pricing.averagePricePerKg || 0,
        displayPrice: pricing.pricing?.displayPrice || pricing.averagePricePerKg || 0,
        marketAverage: pricing.pricing?.marketAverage || null,
        maxPricePerKg: pricing.maxPricePerKg || 0,
        trend: pricing.pricing?.trend || 'insufficient_data',
        changePercent: pricing.pricing?.changePercent || 0
      };
    })
    .filter(Boolean);

  if (materialsWithPricing.length === 0) return null;

  // Calculate estimated total value using display price (60% base + 40% market)
  const estimatedTotal = materialsWithPricing.reduce((sum, mat) => {
    const qty = parseFloat(mat.quantity) || 0;
    return sum + (qty * mat.displayPrice);
  }, 0);

  const maxTotal = materialsWithPricing.reduce((sum, mat) => {
    const qty = parseFloat(mat.quantity) || 0;
    const price = mat.maxPricePerKg > 0 ? mat.maxPricePerKg : mat.displayPrice;
    return sum + (qty * price);
  }, 0);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp size={14} className={styles.trendUp} />;
      case 'decreasing': return <TrendingDown size={14} className={styles.trendDown} />;
      case 'stable': return <Minus size={14} className={styles.trendStable} />;
      default: return null;
    }
  };

  return (
    <div className={styles.pricingContainer}>
      <div className={styles.pricingHeader}>
        <Info size={16} />
        <span>Estimated Pricing (based on PH junk shop averages)</span>
      </div>

      <div className={styles.pricingTable}>
        <div className={styles.tableHeader}>
          <span className={styles.colMaterial}>Material</span>
          <span className={styles.colQty}>Qty</span>
          <span className={styles.colAvg}>Price/kg</span>
          <span className={styles.colMax}>Max/kg</span>
          <span className={styles.colEst}>Est. Value</span>
        </div>

        {materialsWithPricing.map((mat, index) => {
          const qty = parseFloat(mat.quantity) || 0;
          const estValue = qty * mat.displayPrice;

          return (
            <div key={index} className={styles.tableRow}>
              <span className={styles.colMaterial}>
                {mat.materialName || mat.materialID}
                {getTrendIcon(mat.trend)}
              </span>
              <span className={styles.colQty}>{qty} kg</span>
              <span className={styles.colAvg}>
                {mat.displayPrice > 0 ? `₱${mat.displayPrice.toFixed(2)}` : '—'}
              </span>
              <span className={styles.colMax}>
                {mat.maxPricePerKg > 0 ? `₱${mat.maxPricePerKg.toFixed(2)}` : '—'}
              </span>
              <span className={styles.colEst}>
                {estValue > 0 ? `₱${estValue.toFixed(2)}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total estimate */}
      {estimatedTotal > 0 && (
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Estimated Total Value:</span>
          <span className={styles.totalValue}>
            ₱{estimatedTotal.toFixed(2)}
            {maxTotal > estimatedTotal && (
              <span className={styles.maxNote}> (up to ₱{maxTotal.toFixed(2)})</span>
            )}
          </span>
        </div>
      )}

      <p className={styles.disclaimer}>
        Estimated price = 70% base rate + 30% community average (weighted by quantity). Actual prices may vary by location and condition.
      </p>
    </div>
  );
};

export default MaterialPricingInfo;