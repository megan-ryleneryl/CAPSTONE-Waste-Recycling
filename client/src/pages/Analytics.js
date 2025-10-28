import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Analytics.module.css';
import GeographicHeatmap from '../components/analytics/GeographicHeatmap';
import DisposalHubMap from '../components/analytics/DisposalHubMap';
import AddDisposalHubForm from '../components/analytics/AddDisposalHubForm';
import LocationFilter from '../components/analytics/LocationFilter';
import {
  MapPin,
  Recycle,
  TrendingUp,
  Heart,
  Leaf,
  Trophy,
  Users,
  Package,
  Plus,
  Trees,
  Droplets,
  Zap
} from 'lucide-react';

const Analytics = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('impact');
  const [selectedTimeRange, setSelectedTimeRange] = useState('year');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [heatMapData, setHeatMapData] = useState([]);
  const [disposalSites, setDisposalSites] = useState([]);
  const [showAddHubForm, setShowAddHubForm] = useState(false);

  // Location filter state
  const [locationFilter, setLocationFilter] = useState({
    region: null,
    province: null,
    city: null,
    barangay: null
  });

  // Disposal hub search state
  const [searchLocation, setSearchLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(10); // Default 10km

  // Memoized callback to prevent infinite loops
  const handleLocationFilterChange = useCallback((newFilter) => {
    setLocationFilter(newFilter);
  }, []);

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedTimeRange, locationFilter.region, locationFilter.province, locationFilter.city, locationFilter.barangay]);

  useEffect(() => {
    if (activeTab === 'activity' && user) {
      fetchHeatMapData();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'nearby' && user) {
      fetchDisposalSites();
    }
  }, [activeTab, user, searchLocation, searchRadius]);

  const fetchAnalyticsData = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (!token) {
        setError('Authentication token not found');
        navigate('/login');
        return;
      }

      // Build query parameters including location filter
      const params = new URLSearchParams({ timeRange: selectedTimeRange });
      if (locationFilter.region) params.append('region', locationFilter.region);
      if (locationFilter.province) params.append('province', locationFilter.province);
      if (locationFilter.city) params.append('city', locationFilter.city);
      if (locationFilter.barangay) params.append('barangay', locationFilter.barangay);

      const response = await axios.get(
        `http://localhost:3001/api/analytics/dashboard?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Full API response:', response.data);

      if (response.data.success && response.data.data) {
        setAnalyticsData(response.data.data);
        console.log('Analytics data loaded successfully:', response.data.data);
      } else {
        const errorMsg = 'Failed to load analytics data';
        setError(errorMsg);
        console.error('API response error:', response.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch analytics';
      setError(errorMessage);

      // Set default data on error
      setAnalyticsData({
        totalRecycled: 0,
        totalInitiatives: 0,
        activeUsers: 0,
        totalPickups: 0,
        userStats: {
          totalPosts: 0,
          activePickups: 0,
          completedPickups: 0,
          totalPoints: 0,
          totalKgRecycled: 0
        },
        topCollectors: [],
        wasteByType: {},
        recyclingTrends: [],
        communityImpact: {
          co2Saved: 0,
          treesEquivalent: 0,
          waterSaved: 0,
          energySaved: 0
        },
        recentActivity: [],
        percentageChanges: {
          recycled: '+0%',
          initiatives: '+0%',
          users: '+0%',
          pickups: '+0%'
        }
      });
    } finally {
      setDataLoading(false);
    }
  };

  const getTrendClass = (trend) => {
    if (!trend) return '';
    const value = parseInt(trend);
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  const getTimeRangeLabel = () => {
    switch(selectedTimeRange) {
      case 'week': return 'Past 7 Days';
      case 'month': return 'Past Month';
      case 'year': return 'Current Year (Q1-Q4)';
      case 'all': return 'All Time';
      default: return 'Current Year';
    }
  };

  const fetchHeatMapData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      const response = await axios.get(
        'http://localhost:3001/api/analytics/heatmap?type=geographic',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setHeatMapData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      // Generate fallback geographic data
      const fallbackData = {
        heatmapPoints: [
          { lat: 14.6760, lng: 121.0437, intensity: 0.7 },
          { lat: 14.5547, lng: 121.0244, intensity: 0.4 },
          { lat: 14.5764, lng: 121.0851, intensity: 0.8 }
        ],
        areas: [
          {
            name: 'Quezon City',
            lat: 14.6760,
            lng: 121.0437,
            activityCount: 70,
            activityLevel: 'High',
            posts: 58,
            color: '#f03b20',
            radius: 3000
          }
        ]
      };

      setHeatMapData(fallbackData);
    }
  };

  const fetchDisposalSites = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      // Only fetch if searchLocation is explicitly set
      if (!searchLocation) {
        // Don't fetch on initial load - wait for user to set location
        return;
      }

      const lat = searchLocation.lat;
      const lng = searchLocation.lng;

      const response = await axios.get(
        `http://localhost:3001/api/analytics/disposal-sites?lat=${lat}&lng=${lng}&radius=${searchRadius}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setDisposalSites(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching disposal sites:', error);
      setDisposalSites([]);
    }
  };

  // Handle location change from map
  const handleSearchLocationChange = (newLocation) => {
    setSearchLocation(newLocation);
  };

  // Handle radius change from map
  const handleSearchRadiusChange = (newRadius) => {
    setSearchRadius(newRadius);
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'nearby':
        return (
          <div className={styles.nearbyContent}>
            {user ? (
              <DisposalHubMap
                disposalSites={disposalSites}
                userLocation={user?.location?.coordinates || { lat: 14.5995, lng: 121.0000 }}
                currentSearchLocation={searchLocation}
                searchRadius={searchRadius}
                onLocationChange={handleSearchLocationChange}
                onRadiusChange={handleSearchRadiusChange}
                onSuggestHub={() => setShowAddHubForm(true)}
              />
            ) : (
              <div className={styles.placeholderContent}>
                <MapPin size={48} className={styles.placeholderIcon} />
                <h3>Find Recycling Centers Near You</h3>
                <p>Loading nearby disposal sites...</p>
              </div>
            )}
          </div>
        );

      case 'activity':
        return (
          <div className={styles.activityContent}>
            {heatMapData && (heatMapData.areas || heatMapData.heatmapPoints) ? (
              <GeographicHeatmap
                heatmapData={heatMapData.heatmapPoints || []}
                areaData={heatMapData.areas || []}
                breakdown={heatMapData.breakdown || null}
              />
            ) : (
              <div className={styles.placeholderContent}>
                <Recycle size={48} className={styles.placeholderIcon} />
                <h3>Community Recycling Activity</h3>
                <p>Loading activity data...</p>
              </div>
            )}
          </div>
        );

      case 'impact':
        return renderImpactDashboard();

      default:
        return null;
    }
  };

  const renderImpactDashboard = () => {
    if (!analyticsData) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading analytics data...</p>
        </div>
      );
    }

    // Check if there's any meaningful data
    const hasData = analyticsData.totalRecycled > 0 ||
                    analyticsData.totalInitiatives > 0 ||
                    analyticsData.totalPickups > 0;

    if (!hasData && !dataLoading) {
      return (
        <div className={styles.impactDashboard}>
          <div className={styles.dashboardHeader}>
            <h2>
              <TrendingUp className={styles.headerIcon} />
              Community Impact Dashboard
            </h2>
          </div>

          {/* Location Filter - Show even when no data */}
          <LocationFilter
            onFilterChange={handleLocationFilterChange}
            currentFilter={locationFilter}
          />

          <div className={styles.emptyState}>
            <Recycle size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
            <h3>No Data for Selected Location</h3>
            <p>Try selecting a different location above, or check back once there are:</p>
            <ul style={{ textAlign: 'left', marginTop: '20px', marginBottom: '30px' }}>
              <li>Completed waste pickups</li>
              <li>Active initiative posts</li>
              <li>Active users in the community</li>
            </ul>
            <p>Start by creating a waste post or supporting an initiative!</p>
            <div className={styles.ctaButtons} style={{ marginTop: '30px' }}>
              <button
                className={styles.ctaPrimary}
                onClick={() => navigate('/create-post', { state: { postType: 'Waste' } })}
              >
                <Plus size={18} /> Post Recyclables
              </button>
              <button
                className={styles.ctaSecondary}
                onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
              >
                <Heart size={18} /> Create Initiative
              </button>
            </div>
          </div>
        </div>
      );
    }

    const stats = analyticsData.userStats || {
      totalPosts: 0,
      activePickups: 0,
      completedPickups: 0,
      totalPoints: 0,
      totalKgRecycled: 0
    };

    // FIXED: Safely access impact data with all 4 values
    const impact = analyticsData.communityImpact || {
      co2Saved: 0,
      treesEquivalent: 0,
      waterSaved: 0,
      energySaved: 0
    };

    const changes = analyticsData.percentageChanges || {
      recycled: '+0%',
      initiatives: '+0%',
      users: '+0%',
      pickups: '+0%'
    };

    return (
      <div className={styles.impactDashboard}>
        {dataLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Updating data...</p>
          </div>
        )}
        
        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
          </div>
        )}
        
        <div className={styles.dashboardHeader}>
          <h2>
            <TrendingUp className={styles.headerIcon} />
            Community Impact Dashboard
          </h2>
          <div className={styles.timeRangeSelector}>
            {['week', 'month', 'year', 'all'].map(range => (
              <button
                key={range}
                className={`${styles.timeButton} ${selectedTimeRange === range ? styles.active : ''}`}
                onClick={() => setSelectedTimeRange(range)}
                disabled={dataLoading}
              >
                {range === 'all' ? 'All Time' : `This ${range.charAt(0).toUpperCase() + range.slice(1)}`}
              </button>
            ))}
          </div>
        </div>

        {/* Location Filter */}
        <LocationFilter
          onFilterChange={handleLocationFilterChange}
          currentFilter={locationFilter}
        />

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Recycle />
            </div>
            <div className={styles.metricContent}>
              <h3>{(analyticsData.totalRecycled || 0).toLocaleString()} kg</h3>
              <p>Total Recycled</p>
              <span className={`${styles.trend} ${getTrendClass(changes.recycled)}`}>
                {changes.recycled || '+0%'} from last {selectedTimeRange}
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Heart />
            </div>
            <div className={styles.metricContent}>
              <h3>{analyticsData.totalInitiatives || 0}</h3>
              <p>Active Initiatives</p>
              <span className={`${styles.trend} ${getTrendClass(changes.initiatives)}`}>
                {changes.initiatives || '+0%'} from last {selectedTimeRange}
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Users />
            </div>
            <div className={styles.metricContent}>
              <h3>{(analyticsData.activeUsers || 0).toLocaleString()}</h3>
              <p>Active Users</p>
              <span className={`${styles.trend} ${getTrendClass(changes.users)}`}>
                {changes.users || '+0%'} growth
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Package />
            </div>
            <div className={styles.metricContent}>
              <h3>{analyticsData.totalPickups || 0}</h3>
              <p>Successful Pickups</p>
              <span className={`${styles.trend} ${getTrendClass(changes.pickups)}`}>
                {changes.pickups || '+0%'} completion
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Heart />
            </div>
            <div className={styles.metricContent}>
              <h3>{analyticsData.completedSupports || 0}</h3>
              <p>Completed Supports</p>
              <span className={`${styles.trend} ${getTrendClass('+0%')}`}>
                for initiatives
              </span>
            </div>
          </div>
        </div>

        <div className={styles.chartsContainer}>
          <div className={styles.chartCard}>
            <h3>Waste Distribution by Type</h3>
            <div className={styles.wasteDistribution}>
              {analyticsData.wasteByType && Object.entries(analyticsData.wasteByType).length > 0 ? (
                Object.entries(analyticsData.wasteByType).map(([type, percentage]) => (
                  <div key={type} className={styles.wasteTypeBar}>
                    <div className={styles.wasteTypeLabel}>
                      <span>{type}</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noDataMessage}>No waste data available</p>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <h3>Top Collectors</h3>
            <div className={styles.leaderboard}>
              {analyticsData.topCollectors && analyticsData.topCollectors.length > 0 ? (
                analyticsData.topCollectors.map((collector, index) => (
                  <div key={index} className={styles.leaderboardItem}>
                    <div className={styles.rank}>
                      <Trophy className={`${styles.trophy} ${styles[collector.badge]}`} />
                      <span>#{index + 1}</span>
                    </div>
                    <div className={styles.collectorInfo}>
                      <h4>{collector.name}</h4>
                      <p>{(collector.amount || 0).toLocaleString()} kg collected</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noDataMessage}>No collector data available</p>
              )}
            </div>
          </div>
        </div>

        {/* FIXED: Recycling Trends - Now displays Q1-Q4 for year view */}
        <div className={styles.trendsSection}>
          <h3>Recycling Trends - {getTimeRangeLabel()}</h3>
          <div className={styles.trendsChart}>
            <div className={styles.chartBars}>
              {analyticsData.recyclingTrends && analyticsData.recyclingTrends.length > 0 ? (
                <>
                  {(() => {
                    const maxAmount = Math.max(
                      ...analyticsData.recyclingTrends.map(t => t.amount || 0), 
                      1
                    );
                    return analyticsData.recyclingTrends.map((trend, index) => (
                      <div key={index} className={styles.chartBarContainer}>
                        <div className={styles.chartBarWrapper}>
                          <div 
                            className={styles.chartBar}
                            style={{ 
                              height: `${(trend.amount / maxAmount) * 200}px`,
                              background: `linear-gradient(to top, #3B6535, #B3F2AC)`
                            }}
                          >
                            <span className={styles.barValue}>
                              {trend.amount} kg
                            </span>
                          </div>
                        </div>
                        <span className={styles.barLabel}>
                          {trend.month || `Period ${index + 1}`}
                        </span>
                        {selectedTimeRange === 'year' && trend.label && (
                          <span className={styles.barSublabel}>
                            {trend.label}
                          </span>
                        )}
                      </div>
                    ));
                  })()}
                </>
              ) : (
                <p className={styles.noDataMessage}>No trend data available</p>
              )}
            </div>
          </div>
        </div>

        {/* FIXED: Environmental Impact Section - Now displays all 4 values */}
        <div className={styles.impactSection}>
          <h3>Environmental Impact</h3>
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <Leaf className={styles.impactIcon} />
              <h4>{(impact.co2Saved || 0).toLocaleString()} kg</h4>
              <p>CO₂ Emissions Saved</p>
            </div>
            <div className={styles.impactCard}>
              <Trees className={styles.impactIcon} />
              <h4>{(impact.treesEquivalent || 0).toLocaleString()}</h4>
              <p>Trees Equivalent</p>
            </div>
            <div className={styles.impactCard}>
              <Droplets className={styles.impactIcon} />
              <h4>{(impact.waterSaved || 0).toLocaleString()} L</h4>
              <p>Water Saved</p>
            </div>
            <div className={styles.impactCard}>
              <Zap className={styles.impactIcon} />
              <h4>{(impact.energySaved || 0).toLocaleString()} kWh</h4>
              <p>Energy Saved</p>
            </div>
          </div>
        </div>

        <div className={styles.ctaSection}>
          <h3>Join the Movement!</h3>
          <p>Be part of the solution. Start recycling today.</p>
          <div className={styles.ctaButtons}>
            <button 
              className={styles.ctaPrimary}
              onClick={() => navigate('/create-post', { state: { postType: 'Waste' } })}
            >
              <Plus size={18} /> Post Recyclables
            </button>
            <button 
              className={styles.ctaSecondary}
              onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
            >
              <Heart size={18} /> Support Initiatives
            </button>
            <button 
              className={styles.ctaTertiary}
              onClick={() => navigate('/create-post', { state: { postType: 'Forum' } })}
            >
              Share Knowledge
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!user || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Add Disposal Hub Form Modal */}
      {showAddHubForm && (
        <AddDisposalHubForm
          onClose={() => setShowAddHubForm(false)}
          onSuccess={(newHub) => {
            console.log('New hub suggested:', newHub);
            // Refresh disposal sites
            if (activeTab === 'nearby' && user) {
              fetchDisposalSites();
            }
          }}
          userLocation={user?.location?.coordinates || null}
        />
      )}

      <div className={styles.welcomeSection}>
        <div className={styles.welcomeHeader}>
          <div>
            <h1 className={styles.welcomeTitle}>Community Stats</h1>
            <p className={styles.welcomeSubtitle}>
              This is what's happening within our community's recycling activities.
            </p>
          </div>
          <div className={styles.userQuickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.activeUsers || 0}
              </span>
              <span className={styles.quickStatLabel}>Active Users</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.totalInitiatives || 0}
              </span>
              <span className={styles.quickStatLabel}>Initiatives</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.totalRecycled || 0} kg
              </span>
              <span className={styles.quickStatLabel}>Recycled</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.analyticsSection}>
        <div className={styles.navTabs}>
          <button
            className={`${styles.navTab} ${activeTab === 'impact' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('impact')}
          >
            <TrendingUp size={18} /> Impact & Stats
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'nearby' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            <MapPin size={18} /> Find Nearby Centers
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'activity' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Recycle size={18} /> Community Activity
          </button>
          
        </div>

        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>

      <div className={styles.quickActions}>
        <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
        <div className={styles.actionButtonsGrid}>
          <button className={styles.actionButton} onClick={() => navigate('/create-post')}>
            Create New Waste Post
          </button>
          <button className={styles.actionButtonSecondary} onClick={() => navigate('/posts')}>
            Browse Available Waste
          </button>
          <button className={styles.actionButtonSecondary} onClick={() => navigate('/pickups')}>
            View My Pickups
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;