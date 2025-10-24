import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PostsAnalytics.module.css';
import {
  TrendingUp,
  Award,
  Recycle,
  AlertCircle
} from 'lucide-react';

const PostsAnalytics = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [topLocations, setTopLocations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
      fetchTopLocations();
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

        // Check if topAreas is included in the response
        if (response.data.data.topAreas) {
          setTopLocations(response.data.data.topAreas);
        }
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

  const extractCityName = (locationData) => {
    // Handle both string and object inputs
    let locationString = '';
    let cityFromData = null;

    if (typeof locationData === 'string') {
      locationString = locationData;
    } else if (locationData && typeof locationData === 'object') {
      // Try to extract city from location object structure
      cityFromData = locationData.city || locationData.municipality;
      locationString = locationData.name || locationData.area || '';
    }

    // If we have city from object structure, use it
    if (cityFromData) {
      return cityFromData.trim();
    }

    if (!locationString) return null;

    let cityName = locationString.trim();

    // Skip if it's a region (NCR, Region IV-A, etc.)
    if (cityName.match(/^(NCR|Region|REGION|Metropolitan Manila)/i)) {
      return null;
    }

    // Skip barangay entries
    if (cityName.toLowerCase().includes('barangay') ||
        cityName.toLowerCase().includes('brgy.') ||
        cityName.toLowerCase().includes('brgy ')) {
      return null;
    }

    // Handle comma-separated format: "Barangay, City, Province"
    // For NCR: "Barangay, City" (no province)
    if (cityName.includes(',')) {
      const parts = cityName.split(',').map(p => p.trim());

      // If there are 3 parts: barangay, city, province - take the middle one (city)
      if (parts.length === 3) {
        cityName = parts[1];
      }
      // If there are 2 parts: barangay, city - take the last one (city)
      else if (parts.length === 2) {
        // Check if first part looks like barangay
        if (parts[0].toLowerCase().includes('barangay') ||
            parts[0].toLowerCase().includes('brgy')) {
          cityName = parts[1];
        } else {
          // Otherwise take the last part
          cityName = parts[parts.length - 1];
        }
      }
    }

    // Clean up common patterns
    cityName = cityName
      .replace(/^City of /i, '')
      .replace(/^Municipality of /i, '')
      .replace(/^Lungsod ng /i, '') // Filipino for "City of"
      .trim();

    // Keep "City" suffix for proper names (e.g., "Quezon City")
    // This is already in the correct format

    return cityName || null;
  };

  const fetchTopLocations = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (!token) return;

      // Try fetching area activity data
      const response = await axios.get(
        'http://localhost:3001/api/analytics/heatmap?type=geographic',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success && response.data.data?.areas) {
        // Filter and aggregate by city only (exclude barangay-level data)
        const cityAggregation = {};

        response.data.data.areas.forEach(area => {
          // Extract city name from the location string
          const rawName = area.name || area.area || '';
          const cityName = extractCityName(rawName);

          // Skip if null (barangay) or unknown
          if (!cityName || cityName === 'Unknown') {
            return;
          }

          const count = area.activityCount || area.posts || 0;

          if (cityAggregation[cityName]) {
            cityAggregation[cityName] += count;
          } else {
            cityAggregation[cityName] = count;
          }
        });

        // Convert to array, sort by count, and get top 5 cities
        const sortedCities = Object.entries(cityAggregation)
          .map(([city, count]) => ({
            name: city,
            count: count,
            area: city
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopLocations(sortedCities);
      }
    } catch (error) {
      console.error('Error fetching top locations:', error);
      // If API fails, locations will remain empty array
    }
  };

  const getMaterialBreakdown = () => {
    if (!analyticsData?.wasteByType) return [];
    return Object.entries(analyticsData.wasteByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([type, percentage]) => ({ type, percentage }));
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

  const materialBreakdown = getMaterialBreakdown();

  return (
    <div className={styles.analyticsContainer}>
      {/* Total Recycled - Hero Section */}
      <div className={styles.heroSection}>
        {/* <div className={styles.heroIcon}>
          <Recycle size={48} />
        </div> */}
        <div className={styles.heroContent}>
          <h2 className={styles.heroValue}>{(analyticsData?.totalRecycled || 0).toLocaleString()} kg</h2>
          <p className={styles.heroLabel}>Total Waste Recycled</p>
        </div>
      </div>

      {/* Waste Distribution by Type */}
      {materialBreakdown.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {/* <Recycle size={20} /> */}
            Waste Distribution by Type
          </h3>

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

      {/* Top Locations */}
      {topLocations.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <TrendingUp size={20} />
            Top Cities Actively Collecting
          </h3>

          <div className={styles.locationList}>
            {topLocations.map((location, index) => {
              const maxCount = topLocations[0]?.count || 1;
              const currentCount = location.count || 0;
              const percentage = (currentCount / maxCount) * 100;

              return (
                <div key={index} className={styles.locationItem}>
                  <div className={styles.locationRank}>#{index + 1}</div>
                  <div className={styles.locationInfo}>
                    <span className={styles.locationName}>{location.name}</span>
                    <span className={styles.locationCount}>{currentCount} active posts</span>
                    <div className={styles.locationBar}>
                      <div
                        className={styles.locationBarFill}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <TrendingUp size={20} />
            Top Cities Actively Collecting
          </h3>
          <p className={styles.noDataMessage}>No city data available yet.</p>
        </div>
      )}

      {/* Top Collectors */}
      {analyticsData?.topCollectors && analyticsData.topCollectors.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Award size={20} />
            Top Collectors
          </h3>
          <div className={styles.collectorList}>
            {analyticsData.topCollectors.slice(0, 5).map((collector, index) => (
              <div key={index} className={styles.collectorItem}>
                <div className={styles.collectorRank} style={{
                  background: index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                             index === 1 ? 'linear-gradient(135deg, #C0C0C0, #A9A9A9)' :
                             index === 2 ? 'linear-gradient(135deg, #CD7F32, #B8860B)' :
                             'linear-gradient(135deg, #6B7280, #4B5563)'
                }}>
                  #{index + 1}
                </div>
                <div className={styles.collectorDetails}>
                  <span className={styles.collectorName}>{collector.name || 'Anonymous'}</span>
                  <span className={styles.collectorAmount}>{(collector.amount || 0).toLocaleString()} kg</span>
                </div>
                {index < 3 && (
                  <div className={styles.collectorBadge}>
                    <Award size={18} style={{
                      color: index === 0 ? '#FFD700' :
                             index === 1 ? '#C0C0C0' :
                             '#CD7F32'
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className={styles.subheading}>Want to know how your community is doing?</p>
      <button
        className={styles.analyticsButton}
        onClick={() => navigate('/analytics')}
      >
        See full analytics
      </button>
    </div>
  );
};

export default PostsAnalytics;