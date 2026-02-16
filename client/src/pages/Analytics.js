import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Analytics.module.css';
import GeographicHeatmap from '../components/analytics/GeographicHeatmap';
import DisposalHubMap from '../components/analytics/DisposalHubMap';
import AddDisposalHubForm from '../components/analytics/AddDisposalHubForm';
import LocationFilter from '../components/analytics/LocationFilter';
import GuideLink from '../components/guide/GuideLink';
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
  Zap,
  Info,
  Wallet,
  DollarSign,
  Award,
  Lightbulb
} from 'lucide-react';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

  // Helper function to check if location filter is applied
  const hasLocationFilter = () => {
    return locationFilter.region || locationFilter.province ||
           locationFilter.city || locationFilter.barangay;
  };

  // Get appropriate label for active users based on filter
  const getActiveUsersLabel = () => {
    return hasLocationFilter()
      ? 'Active Users (Joined This Community)'
      : 'Active Users';
  };

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

  // Use useCallback to memoize fetchAnalyticsData with dependencies
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

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
        `${API_BASE_URL}/api/analytics/dashboard?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;

        // Check if location has no activity
        const hasActivity = data.totalRecycled > 0 ||
                           data.totalInitiatives > 0 ||
                           data.totalPickups > 0 ||
                           data.activeUsers > 0;

        if (!hasActivity && hasLocationFilter()) {
          // Check if there's data at a broader level
          let errorMsg = 'No recycling activity found in this location yet.';

          if (locationFilter.city || locationFilter.barangay) {
            // Check if there's data at region level
            const regionalParams = new URLSearchParams({ timeRange: selectedTimeRange });
            if (locationFilter.region) regionalParams.append('region', locationFilter.region);

            try {
              const regionalResponse = await axios.get(
                `${API_BASE_URL}/api/analytics/dashboard?${regionalParams.toString()}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const regionalData = regionalResponse.data.data;
              const hasRegionalActivity = regionalData.totalRecycled > 0 ||
                                         regionalData.totalInitiatives > 0 ||
                                         regionalData.totalPickups > 0 ||
                                         regionalData.activeUsers > 0;

              if (hasRegionalActivity) {
                errorMsg = 'No data found for this specific location, but there is activity in the broader region. Try selecting a different city or broaden your filter to see regional data.';
              }
            } catch (regionalError) {
              // If regional check fails, use default message
            }
          }

          setError(errorMsg);
        } else {
          // Clear error if there is activity or no filter
          setError(null);
        }

        setAnalyticsData(data);
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
        completedInitiatives: 0,
        activeUsers: 0,
        totalPickups: 0,
        completedSupports: 0,
        wasteDistribution: [],
        trends: [],
        topCollectors: [],
        recentActivity: [],
        percentageChanges: {}
      });
    } finally {
      setDataLoading(false);
    }
  }, [user, selectedTimeRange, locationFilter.region, locationFilter.province, locationFilter.city, locationFilter.barangay, navigate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

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

  const getTrendClass = (trend) => {
    if (!trend) return '';
    const value = parseInt(trend);
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  // Helper function to format period dates
  const formatPeriodDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getPeriodLabel = (percentageChanges) => {
    if (!percentageChanges?.currentPeriod || !percentageChanges?.previousPeriod) return '';
    const currentStart = formatPeriodDate(percentageChanges.currentPeriod.start);
    const currentEnd = formatPeriodDate(percentageChanges.currentPeriod.end);
    const prevStart = formatPeriodDate(percentageChanges.previousPeriod.start);
    const prevEnd = formatPeriodDate(percentageChanges.previousPeriod.end);
    return `${currentStart}-${currentEnd} vs ${prevStart}-${prevEnd}`;
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

  // Real-world equivalency helper for environmental impact
  const getEquivalency = (type, value) => {
    if (!value || value === 0) return null;
    switch(type) {
      case 'co2': {
        const cars = value / 4600;
        return cars >= 1
          ? `Like taking ${Math.round(cars)} car${Math.round(cars) > 1 ? 's' : ''} off the road for a year`
          : `Like removing a car from the road for ${Math.round(cars * 365)} days`;
      }
      case 'trees': {
        const sqm = Math.round(value * 25);
        return sqm > 0 ? `Covering about ${sqm.toLocaleString()} sq meters of forest` : null;
      }
      case 'water': {
        const bathtubs = Math.round(value / 250);
        return bathtubs > 0
          ? `Enough to fill ${bathtubs.toLocaleString()} bathtub${bathtubs > 1 ? 's' : ''}`
          : `About ${Math.round(value)} glasses of water`;
      }
      case 'energy': {
        const homes = value / 30;
        return homes >= 1
          ? `Powers ${Math.round(homes)} home${Math.round(homes) > 1 ? 's' : ''} for a day`
          : `About ${Math.round(value)} hours of air conditioning`;
      }
      default: return null;
    }
  };

  // Icon map for recommendations
  const recommendationIcons = {
    Plus: <Plus size={20} />,
    Heart: <Heart size={20} />,
    TrendingUp: <TrendingUp size={20} />,
    Trophy: <Trophy size={20} />,
    Users: <Users size={20} />
  };

  // Generate smart actionable recommendations based on user data
  const generateRecommendations = () => {
    if (!analyticsData) return [];

    const recommendations = [];
    const stats = analyticsData.userStats || {};
    const wasteTypes = analyticsData.wasteByType || {};

    // 1. User has never recycled
    if (!stats.totalKgRecycled || stats.totalKgRecycled === 0) {
      recommendations.push({
        icon: 'Plus',
        title: 'Start Your Recycling Journey',
        text: 'Post your first recyclable waste and earn points!',
        action: { label: 'Create Post', route: '/create-post', state: { postType: 'Waste' } }
      });
    }

    // 2. User recycles but hasn't supported initiatives
    if (stats.totalKgRecycled > 0 && (!analyticsData.completedSupports || analyticsData.completedSupports === 0)) {
      recommendations.push({
        icon: 'Heart',
        title: 'Support an Initiative',
        text: `There are ${analyticsData.totalInitiatives || 0} active initiatives. Join one to multiply your impact!`,
        action: { label: 'Browse Initiatives', route: '/posts' }
      });
    }

    // 3. Low activity waste type - suggest posting it
    const sortedTypes = Object.entries(wasteTypes).sort(([, a], [, b]) => a - b);
    if (sortedTypes.length > 0) {
      const [lowestType, lowestPct] = sortedTypes[0];
      if (lowestPct < 15) {
        recommendations.push({
          icon: 'TrendingUp',
          title: `${lowestType} is Under-recycled`,
          text: `Only ${lowestPct}% of recycling is ${lowestType}. Got some? Post it to help balance the mix!`,
          action: { label: 'Post Recyclables', route: '/create-post', state: { postType: 'Waste' } }
        });
      }
    }

    // 4. User is doing well - encourage them
    if (stats.totalKgRecycled > 0 && stats.completedPickups >= 3) {
      const userPct = analyticsData.totalRecycled > 0
        ? Math.round((stats.totalKgRecycled / analyticsData.totalRecycled) * 100)
        : 0;
      if (userPct >= 5) {
        recommendations.push({
          icon: 'Trophy',
          title: "You're a Top Contributor!",
          text: `You've contributed ${userPct}% of all recycling. Keep the momentum going!`,
          action: null
        });
      }
    }

    // 5. Community is growing
    const growthPct = parseInt(analyticsData.percentageChanges?.users || '0');
    if (growthPct > 0) {
      recommendations.push({
        icon: 'Users',
        title: 'Community is Growing',
        text: `${growthPct}% more users joined recently. Share EcoTayo with friends to keep the momentum!`,
        action: null
      });
    }

    return recommendations.slice(0, 3);
  };

  const fetchHeatMapData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      const response = await axios.get(
        '${API_BASE_URL}/api/analytics/heatmap?type=geographic',
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
        `${API_BASE_URL}/api/analytics/disposal-sites?lat=${lat}&lng=${lng}&radius=${searchRadius}`,
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
            {/* Educational Tip Box */}
            <div className={styles.tipBox}>
              <MapPin size={20} className={styles.tipIcon} />
              <div className={styles.tipContent}>
                <strong>Why find nearby centers?</strong>
                <p>Discover MRFs (Material Recovery Facilities) and junk shops near you
                that accept recyclables. Drop off materials directly or find backup options
                when collectors aren't available.</p>
              </div>
            </div>

            {user ? (
              <>
                <DisposalHubMap
                  disposalSites={disposalSites}
                  userLocation={user?.location?.coordinates || { lat: 14.5995, lng: 121.0000 }}
                  currentSearchLocation={searchLocation}
                  searchRadius={searchRadius}
                  onLocationChange={handleSearchLocationChange}
                  onRadiusChange={handleSearchRadiusChange}
                  onSuggestHub={() => setShowAddHubForm(true)}
                />

                {/* Connection Hint */}
                <div className={styles.connectionHint}>
                  Curious where recycling is most active in your area?{' '}
                  <button onClick={() => setActiveTab('activity')} className={styles.inlineLink}>
                    View Community Activity →
                  </button>
                </div>
              </>
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
            {/* Educational Tip Box */}
            <div className={styles.tipBox}>
              <Recycle size={20} className={styles.tipIcon} />
              <div className={styles.tipContent}>
                <strong>Why see community activity?</strong>
                <p>The heatmap shows where recycling is most active across the Philippines.
                High activity zones (darker colors) have many posts and pickups, while lighter
                areas need more initiatives. Use this to decide where to post or which communities
                to support.</p>
              </div>
            </div>

            {heatMapData && (heatMapData.areas || heatMapData.heatmapPoints) ? (
              <>
                <GeographicHeatmap
                  heatmapData={heatMapData.heatmapPoints || []}
                  areaData={heatMapData.areas || []}
                  breakdown={heatMapData.breakdown || null}
                />

                {/* Light Tip */}
                <div className={styles.lightTip}>
                  High activity = faster pickups! Low activity = opportunity to lead initiatives.
                </div>

                {/* Connection Hint */}
                <div className={styles.connectionHint}>
                  Ready to contribute to these numbers?{' '}
                  <button onClick={() => setActiveTab('impact')} className={styles.inlineLink}>
                    Back to Impact & Stats
                  </button>
                </div>
              </>
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

    // Don't show comparisons for "All Time" since there's no meaningful previous period
    const showComparisons = selectedTimeRange !== 'all';

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
              {showComparisons && (
                <span className={`${styles.trend} ${getTrendClass(changes.recycled)}`}>
                  {changes.recycled || '+0%'}
                </span>
              )}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Heart />
            </div>
            <div className={styles.metricContent}>
              <h3>{analyticsData.completedInitiatives || 0}</h3>
              <p>Completed Initiatives</p>
              {showComparisons && (
                <span className={`${styles.trend} ${getTrendClass(changes.initiatives)}`}>
                  {changes.initiatives || '+0%'}
                </span>
              )}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Users />
            </div>
            <div className={styles.metricContent}>
              <h3>{(analyticsData.activeUsers || 0).toLocaleString()}</h3>
              <p>{getActiveUsersLabel()}</p>
              {showComparisons && (
                <span className={`${styles.trend} ${getTrendClass(changes.users)}`}>
                  {changes.users || '+0%'} growth
                </span>
              )}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Package />
            </div>
            <div className={styles.metricContent}>
              <h3>{analyticsData.totalPickups || 0}</h3>
              <p>Successful Pickups</p>
              {showComparisons && (
                <span className={`${styles.trend} ${getTrendClass(changes.pickups)}`}>
                  {changes.pickups || '+0%'}
                </span>
              )}
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <Heart />
            </div>
            <div className={styles.metricContent}>
              <h3>{analyticsData.completedSupports || 0}</h3>
              <p>Completed Supports</p>
              {showComparisons && (
                <span className={`${styles.trend} ${getTrendClass(changes.supports)}`}>
                  {changes.supports || '+0%'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Period Comparison Label - hidden for All Time */}
        {showComparisons && getPeriodLabel(changes) && (
          <div className={styles.periodComparisonLabel}>
            Comparing: {getPeriodLabel(changes)}
          </div>
        )}

        {/* Personal Contribution Context */}
        <div className={styles.personalContribution}>
          <div className={styles.contributionHeader}>
            <Award size={20} className={styles.contributionIcon} />
            <h3>Your Contribution</h3>
          </div>
          {stats.totalKgRecycled > 0 ? (
            <div className={styles.contributionGrid}>
              <div className={styles.contributionStat}>
                <span className={styles.contributionValue}>
                  {(stats.totalKgRecycled || 0).toLocaleString()} kg
                </span>
                <span className={styles.contributionLabel}>You Recycled</span>
              </div>
              <div className={styles.contributionStat}>
                <span className={styles.contributionValue}>
                  {analyticsData.totalRecycled > 0
                    ? `${Math.round((stats.totalKgRecycled / analyticsData.totalRecycled) * 100)}%`
                    : '0%'}
                </span>
                <span className={styles.contributionLabel}>of Community Total</span>
              </div>
              <div className={styles.contributionStat}>
                <span className={styles.contributionValue}>
                  {stats.completedPickups || 0}
                </span>
                <span className={styles.contributionLabel}>Successful Pickups</span>
              </div>
              <div className={styles.contributionStat}>
                <span className={styles.contributionValue}>
                  {stats.totalPoints || 0}
                </span>
                <span className={styles.contributionLabel}>Points Earned</span>
              </div>
            </div>
          ) : (
            <div className={styles.contributionEmpty}>
              <p>Start recycling to see your contribution here!</p>
              <button
                className={styles.contributionAction}
                onClick={() => navigate('/create-post', { state: { postType: 'Waste' } })}
              >
                <Plus size={16} /> Post Your First Recyclable
              </button>
            </div>
          )}
        </div>

        {/* Educational Tip Box */}
        <div className={styles.tipBox}>
          <TrendingUp size={20} className={styles.tipIcon} />
          <div className={styles.tipContent}>
            <strong>Why track community impact?</strong>
            <p>These aggregated statistics show our collective recycling achievements.
            See what materials are being recycled most, who the top collectors are,
            and track our environmental progress together.</p>
          </div>
        </div>



        <div className={styles.chartsContainer}>
          <div className={styles.chartCard}>
            <h3>Waste Distribution by Type</h3>
            <div className={styles.wasteDistribution}>
              {analyticsData.wasteByType && Object.entries(analyticsData.wasteByType).length > 0 ? (
                Object.entries(analyticsData.wasteByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, percentage]) => (
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

          <div className={styles.chartCard}>
            <h3>Top Recyclers</h3>
            <div className={styles.leaderboard}>
              {analyticsData.topRecyclers && analyticsData.topRecyclers.length > 0 ? (
                analyticsData.topRecyclers.map((recycler, index) => (
                  <div key={index} className={styles.leaderboardItem}>
                    <div className={styles.rank}>
                      <Trophy className={`${styles.trophy} ${styles[recycler.badge]}`} />
                      <span>#{index + 1}</span>
                    </div>
                    <div className={styles.collectorInfo}>
                      <h4>{recycler.name}</h4>
                      <p>{(recycler.amount || 0).toLocaleString()} kg recycled</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noDataMessage}>No recycler data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Community Earnings Section */}
        <div className={styles.earningsSection}>
          <div className={styles.earningsHeader}>
            <h3>
              <Wallet size={20} className={styles.earningsIcon} />
              Community Earnings
            </h3>
            <p className={styles.earningsSubtitle}>
              See how much our community earns from recycling
            </p>
          </div>

          {/* Community Stats */}
          <div className={styles.earningsStats}>
            <div className={styles.earningStat}>
              <DollarSign size={24} className={styles.earningStatIcon} />
              <div>
                <span className={styles.earningValue}>
                  ₱{(analyticsData.communityEarnings?.totalCommunityEarnings || 0).toLocaleString()}
                </span>
                <span className={styles.earningLabel}>Total Earned by Community</span>
              </div>
            </div>
            <div className={styles.earningStat}>
              <div>
                <span className={styles.earningValue}>
                  ₱{(analyticsData.communityEarnings?.averagePerPickup || 0).toFixed(2)}
                </span>
                <span className={styles.earningLabel}>Avg. per Pickup</span>
              </div>
            </div>
            <div className={styles.earningStat}>
              <div>
                <span className={styles.earningValue}>
                  {analyticsData.communityEarnings?.uniqueEarners || 0}
                </span>
                <span className={styles.earningLabel}>People Earning</span>
              </div>
            </div>
          </div>

          {/* Your Earnings Context */}
          <div className={styles.yourEarnings}>
            <h4>Your Earnings ({getTimeRangeLabel()})</h4>
            <div className={styles.yourEarningsGrid}>
              <div>
                <span className={styles.yourEarningsValue}>
                  ₱{(analyticsData.userEarnings?.totalEarnings || 0).toLocaleString()}
                </span>
                <span className={styles.yourEarningsLabel}>Total Earned</span>
              </div>
              <div>
                <span className={styles.yourEarningsValue}>
                  {analyticsData.userEarnings?.pickupCount || 0}
                </span>
                <span className={styles.yourEarningsLabel}>Paid Pickups</span>
              </div>
            </div>
          </div>

          {/* Top Earners Leaderboard */}
          <div className={styles.topEarnersSection}>
            <h4>Top Earners</h4>
            <div className={styles.leaderboard}>
              {analyticsData.topEarners && analyticsData.topEarners.length > 0 ? (
                analyticsData.topEarners.map((earner, index) => (
                  <div key={index} className={styles.leaderboardItem}>
                    <div className={styles.rank}>
                      <Trophy className={`${styles.trophy} ${styles[earner.badge]}`} />
                      <span>#{index + 1}</span>
                    </div>
                    <div className={styles.collectorInfo}>
                      <h4 className={earner.isAnonymous ? styles.anonymousName : ''}>
                        {earner.name}
                      </h4>
                      <p>₱{(earner.totalEarnings || 0).toLocaleString()} earned</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noEarnersMessage}>
                  <p>No users have opted in to show earnings yet.</p>
                  <p className={styles.noEarnersHint}>
                    You can opt in from your Profile → Privacy Settings
                  </p>
                </div>
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

        {/* Environmental Impact Section with Real-World Equivalencies */}
        <div className={styles.impactSection}>
          <h3>Environmental Impact</h3>
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <Leaf className={styles.impactIcon} />
              <h4>{(impact.co2Saved || 0).toLocaleString()} kg</h4>
              <p>CO₂ Emissions Saved</p>
              {getEquivalency('co2', impact.co2Saved) && (
                <p className={styles.equivalencyText}>{getEquivalency('co2', impact.co2Saved)}</p>
              )}
            </div>
            <div className={styles.impactCard}>
              <Trees className={styles.impactIcon} />
              <h4>{(impact.treesEquivalent || 0).toLocaleString()}</h4>
              <p>Trees Equivalent</p>
              {getEquivalency('trees', impact.treesEquivalent) && (
                <p className={styles.equivalencyText}>{getEquivalency('trees', impact.treesEquivalent)}</p>
              )}
            </div>
            <div className={styles.impactCard}>
              <Droplets className={styles.impactIcon} />
              <h4>{(impact.waterSaved || 0).toLocaleString()} L</h4>
              <p>Water Saved</p>
              {getEquivalency('water', impact.waterSaved) && (
                <p className={styles.equivalencyText}>{getEquivalency('water', impact.waterSaved)}</p>
              )}
            </div>
            <div className={styles.impactCard}>
              <Zap className={styles.impactIcon} />
              <h4>{(impact.energySaved || 0).toLocaleString()} kWh</h4>
              <p>Energy Saved</p>
              {getEquivalency('energy', impact.energySaved) && (
                <p className={styles.equivalencyText}>{getEquivalency('energy', impact.energySaved)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actionable Recommendations */}
        {generateRecommendations().length > 0 && (
          <div className={styles.recommendationsSection}>
            <h3>
              <Lightbulb size={20} className={styles.recommendationsIcon} />
              What You Can Do Next
            </h3>
            <div className={styles.recommendationsGrid}>
              {generateRecommendations().map((rec, index) => (
                <div key={index} className={styles.recommendationCard}>
                  <div className={styles.recommendationIconWrapper}>
                    {recommendationIcons[rec.icon]}
                  </div>
                  <div className={styles.recommendationContent}>
                    <h4>{rec.title}</h4>
                    <p>{rec.text}</p>
                    {rec.action && (
                      <button
                        className={styles.recommendationAction}
                        onClick={() => navigate(rec.action.route, rec.action.state ? { state: rec.action.state } : undefined)}
                      >
                        {rec.action.label}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Connection Hint */}
        <div className={styles.connectionHint}>
          Want to find where to drop off these materials?{' '}
          <button onClick={() => setActiveTab('nearby')} className={styles.inlineLink}>
            Find Nearby Centers →
          </button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 className={styles.welcomeTitle}>Community Stats</h1>
              <GuideLink text="Understanding these analytics" targetPage={2} icon={<Info size={16} />} />
            </div>
            <p className={styles.welcomeSubtitle}>
              This is what's happening within our community's recycling activities.
            </p>
          </div>
          <div className={styles.userQuickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.activeUsers || 0}
              </span>
              <span className={styles.quickStatLabel}>{getActiveUsersLabel()}</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.totalInitiatives || 0}
              </span>
              <span className={styles.quickStatLabel}>Active Initiatives</span>
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