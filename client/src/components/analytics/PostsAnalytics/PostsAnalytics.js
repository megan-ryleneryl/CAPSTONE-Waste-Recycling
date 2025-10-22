// client/src/components/analytics/PostsAnalytics/PostsAnalytics.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './PostsAnalytics.module.css';
import {
  TrendingUp,
  Package,
  Award,
  Leaf,
  BarChart3,
  Target,
  Calendar,
  MapPin,
  Recycle,
  AlertCircle
} from 'lucide-react';

const PostsAnalytics = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await axios.get(
        'http://localhost:3001/api/analytics/dashboard?timeRange=all',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        setAnalyticsData(response.data.data);
      } else {
        setError('Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.response?.data?.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialBreakdown = () => {
    if (!analyticsData?.wasteByType) return [];
    return Object.entries(analyticsData.wasteByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, percentage]) => ({ type, percentage }));
  };

  const getTopMaterial = () => {
    const breakdown = getMaterialBreakdown();
    return breakdown.length > 0 ? breakdown[0] : null;
  };

  const getMaterialColor = (type) => {
    const colors = {
      'Plastic': '#3B82F6',
      'Paper': '#8B4513',
      'Metal': '#6B7280',
      'Glass': '#10B981',
      'E-waste': '#8B5CF6',
      'Organic': '#84CC16'
    };
    return colors[type] || '#6B7280';
  };

  const getUserRole = () => {
    if (!user) return 'Giver';
    if (user.isCollector) return 'Collector';
    if (user.isOrganization) return 'Organization';
    return 'Giver';
  };

  const getRoleSpecificStats = () => {
    const role = getUserRole();
    if (!analyticsData) return null;

    switch (role) {
      case 'Collector':
        return analyticsData.collectorStats;
      case 'Organization':
        return analyticsData.organizationStats;
      case 'Giver':
      default:
        return analyticsData.giverStats;
    }
  };

  if (loading) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading your stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <p>{error}</p>
          <button onClick={fetchAnalyticsData} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const userStats = analyticsData?.userStats || {};
  const roleStats = getRoleSpecificStats() || {};
  const topMaterial = getTopMaterial();
  const materialBreakdown = getMaterialBreakdown();
  const impact = analyticsData?.communityImpact || {};

  return (
    <div className={styles.analyticsContainer}>
      {/* Header Section */}
      <div className={styles.header}>
        <h2>
          <BarChart3 className={styles.headerIcon} />
          My Stats Dashboard
        </h2>
        <p className={styles.subtitle}>Track your waste journey and environmental impact</p>
      </div>

      {/* Key Metrics Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
            <Package size={24} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{userStats.totalPosts || 0}</span>
            <span className={styles.metricLabel}>Total Posts</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            <Recycle size={24} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{(userStats.totalKgRecycled || 0).toFixed(1)} kg</span>
            <span className={styles.metricLabel}>Waste Recycled</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
            <Award size={24} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{userStats.totalPoints || 0}</span>
            <span className={styles.metricLabel}>Points Earned</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricValue}>{userStats.completedPickups || 0}</span>
            <span className={styles.metricLabel}>Completed Pickups</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Insights */}
      <div className={styles.roleInsights}>
        <h3 className={styles.sectionTitle}>
          <Target size={20} />
          Your {getUserRole()} Insights
        </h3>

        {getUserRole() === 'Giver' && (
          <div className={styles.insightsGrid}>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.activePickups || 0}</span>
              <span className={styles.insightLabel}>Active Pickups</span>
            </div>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.successfulPickups || 0}</span>
              <span className={styles.insightLabel}>Successful Pickups</span>
            </div>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.activeForumPosts || 0}</span>
              <span className={styles.insightLabel}>Forum Posts</span>
            </div>
          </div>
        )}

        {getUserRole() === 'Collector' && (
          <div className={styles.insightsGrid}>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.claimedPosts || 0}</span>
              <span className={styles.insightLabel}>Claimed Posts</span>
            </div>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{(roleStats.totalCollected || 0).toFixed(1)} kg</span>
              <span className={styles.insightLabel}>Total Collected</span>
            </div>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.completionRate || 0}%</span>
              <span className={styles.insightLabel}>Completion Rate</span>
            </div>
          </div>
        )}

        {getUserRole() === 'Organization' && (
          <div className={styles.insightsGrid}>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.activeInitiatives || 0}</span>
              <span className={styles.insightLabel}>Active Initiatives</span>
            </div>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{roleStats.totalSupporters || 0}</span>
              <span className={styles.insightLabel}>Total Supporters</span>
            </div>
            <div className={styles.insightCard}>
              <span className={styles.insightValue}>{(roleStats.materialsReceived || 0).toFixed(1)} kg</span>
              <span className={styles.insightLabel}>Materials Received</span>
            </div>
          </div>
        )}
      </div>

      {/* Material Breakdown */}
      {materialBreakdown.length > 0 && (
        <div className={styles.materialSection}>
          <h3 className={styles.sectionTitle}>
            <Leaf size={20} />
            Material Breakdown
          </h3>

          {topMaterial && (
            <div className={styles.topMaterial}>
              <div
                className={styles.topMaterialBadge}
                style={{ background: getMaterialColor(topMaterial.type) }}
              >
                <Recycle size={20} />
              </div>
              <div className={styles.topMaterialInfo}>
                <span className={styles.topMaterialType}>{topMaterial.type}</span>
                <span className={styles.topMaterialPercentage}>{topMaterial.percentage}% of your waste</span>
              </div>
            </div>
          )}

          <div className={styles.materialBars}>
            {materialBreakdown.map((material, index) => (
              <div key={index} className={styles.materialBar}>
                <div className={styles.materialBarHeader}>
                  <span className={styles.materialType}>{material.type}</span>
                  <span className={styles.materialPercentage}>{material.percentage}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${material.percentage}%`,
                      background: getMaterialColor(material.type)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environmental Impact */}
      <div className={styles.impactSection}>
        <h3 className={styles.sectionTitle}>
          <Leaf size={20} />
          Your Environmental Impact
        </h3>

        <div className={styles.impactGrid}>
          <div className={styles.impactCard}>
            <Leaf className={styles.impactIcon} style={{ color: '#10B981' }} />
            <span className={styles.impactValue}>{(impact.co2Saved || 0).toFixed(1)} kg</span>
            <span className={styles.impactLabel}>CO₂ Saved</span>
          </div>
          <div className={styles.impactCard}>
            <Calendar className={styles.impactIcon} style={{ color: '#8B5CF6' }} />
            <span className={styles.impactValue}>{impact.treesEquivalent || 0}</span>
            <span className={styles.impactLabel}>Trees Equivalent</span>
          </div>
        </div>
      </div>

      {/* Activity Status */}
      <div className={styles.activityStatus}>
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <MapPin size={18} />
            <span>Current Activity</span>
          </div>
          <div className={styles.statusBody}>
            <div className={styles.statusItem}>
              <span className={styles.statusDot} style={{ background: '#10B981' }}></span>
              <span>{userStats.activePickups || 0} Active Pickups</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusDot} style={{ background: '#3B82F6' }}></span>
              <span>{userStats.totalPosts || 0} Total Posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insight */}
      <div className={styles.quickInsight}>
        <div className={styles.insightContent}>
          <TrendingUp className={styles.insightIconLarge} />
          <div className={styles.insightText}>
            <h4>Keep Going!</h4>
            <p>
              {userStats.totalKgRecycled > 0
                ? `You've recycled ${(userStats.totalKgRecycled || 0).toFixed(1)} kg of waste. Every kilogram makes a difference!`
                : "Start posting your recyclables to track your environmental impact!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsAnalytics;