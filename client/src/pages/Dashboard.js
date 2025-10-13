import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Dashboard.module.css';
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
  Droplets 
} from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('impact'); // 'nearby', 'activity', 'impact'
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Analytics data state - will be populated from API
  const [analyticsData, setAnalyticsData] = useState({
    totalRecycled: 0,
    totalInitiatives: 0,
    activeUsers: 0,
    totalPickups: 0,
    userStats: {
      totalPosts: 0,
      activePickups: 0,
      completedPickups: 0,
      totalPoints: 0
    },
    topCollectors: [],
    wasteByType: {
      'Plastic': 0,
      'Paper': 0,
      'Metal': 0,
      'Glass': 0,
      'E-waste': 0
    },
    recyclingTrends: [],
    communityImpact: {
      co2Saved: 0,
      treesEquivalent: 0,
      waterSaved: 0
    },
    recentActivity: []
  });

  const [heatMapData, setHeatMapData] = useState([]);
  const [disposalSites, setDisposalSites] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Fetch analytics data when component mounts or time range changes
  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, selectedTimeRange]);

  // Fetch heatmap data when activity tab is selected
  useEffect(() => {
    if (activeTab === 'activity' && user) {
      fetchHeatMapData();
    }
  }, [activeTab, user]);

  // Fetch disposal sites when nearby tab is selected
  useEffect(() => {
    if (activeTab === 'nearby' && user) {
      fetchDisposalSites();
    }
  }, [activeTab, user]);

  const fetchAnalyticsData = async () => {
    try {
      setDataLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const response = await axios.get(
        `http://localhost:3001/api/analytics/dashboard?timeRange=${selectedTimeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // If API fails, you can keep default data or show error message
      if (error.response?.status === 404) {
        console.log('Analytics endpoint not found, using default data');
      }
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  // Helper function to determine trend class based on value
  const getTrendClass = (trend) => {
    if (!trend) return '';
    const value = parseInt(trend);
    if (value > 0) return styles.trendUp;
    if (value < 0) return styles.trendDown;
    return styles.trendNeutral;
  };

  // Format time range label for display
  const getTimeRangeLabel = () => {
    switch(selectedTimeRange) {
      case 'week': return 'Past 7 Days';
      case 'month': return 'Past Month';
      case 'year': return 'Past Year';
      case 'all': return 'All Time';
      default: return 'Past Month';
    }
  };

  const fetchHeatMapData = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      const response = await axios.get(
        'http://localhost:3001/api/analytics/heatmap',
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
      // Use default data if API fails
      setHeatMapData([
        { area: 'Quezon City', activity: 'high', initiatives: 12, posts: 58 },
        { area: 'Makati', activity: 'medium', initiatives: 8, posts: 34 },
        { area: 'Pasig', activity: 'high', initiatives: 15, posts: 67 },
        { area: 'Taguig', activity: 'low', initiatives: 3, posts: 12 }
      ]);
    }
  };

  const fetchDisposalSites = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      
      // Get user's location if available
      const lat = user?.location?.lat || 14.6549;
      const lng = user?.location?.lng || 121.0645;
      
      const response = await axios.get(
        `http://localhost:3001/api/analytics/disposal-sites?lat=${lat}&lng=${lng}`,
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
      // Use default data if API fails
      setDisposalSites([
        { id: 1, name: 'Green Earth MRF', distance: '1.2 km', types: ['Plastic', 'Paper'], active: true },
        { id: 2, name: 'City Recycling Center', distance: '2.5 km', types: ['All types'], active: true },
        { id: 3, name: 'E-Waste Hub', distance: '3.8 km', types: ['Electronics'], active: true }
      ]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    navigate('/');
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch(activeTab) {
      case 'nearby':
        return (
          <div className={styles.nearbyContent}>
            {disposalSites.length > 0 ? (
              <>
                <div className={styles.mapPlaceholder}>
                  <MapPin size={48} className={styles.placeholderIcon} />
                  <h3>Interactive Map Coming Soon</h3>
                  <p>Add div content here.</p>
                </div>
                <div className={styles.disposalSitesList}>
                  <h3>Disposal Sites Near You</h3>
                  {disposalSites.map(site => (
                    <div key={site.id} className={styles.disposalSite}>
                      <div className={styles.siteInfo}>
                        <h4>{site.name}</h4>
                        <span className={styles.distance}>{site.distance}</span>
                        <div className={styles.acceptedTypes}>
                          {site.types.map(type => (
                            <span key={type} className={styles.typeTag}>{type}</span>
                          ))}
                        </div>
                      </div>
                      <div className={styles.siteActions}>
                        <button 
                          className={styles.postButton}
                          onClick={() => navigate('/create-post')}
                        >
                          <Plus size={16} /> Post
                        </button>
                        <button className={styles.messageButton}>
                          Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.placeholderContent}>
                <MapPin size={48} className={styles.placeholderIcon} />
                <h3>Find Recycling Centers Near You</h3>
                <p>Add div content here.</p>
              </div>
            )}
          </div>
        );
      
      case 'activity':
        return (
          <div className={styles.activityContent}>
            {heatMapData.length > 0 ? (
              <>
                <div className={styles.heatMapGrid}>
                  {heatMapData.map((area, index) => (
                    <div 
                      key={index} 
                      className={`${styles.heatMapCard} ${styles[area.activity]}`}
                    >
                      <div className={styles.areaHeader}>
                        <h3>{area.area}</h3>
                        <span className={`${styles.activityBadge} ${styles[area.activity]}`}>
                          {area.activity.toUpperCase()}
                        </span>
                      </div>
                      <div className={styles.areaStats}>
                        <div className={styles.statItem}>
                          <span className={styles.statValue}>{area.initiatives}</span>
                          <span className={styles.statLabel}>Active Initiatives</span>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statValue}>{area.posts || '50+'}</span>
                          <span className={styles.statLabel}>Weekly Posts</span>
                        </div>
                      </div>
                      <button 
                        className={styles.exploreButton}
                        onClick={() => navigate(`/posts?area=${area.area}`)}
                      >
                        Explore {area.area}
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.placeholderNote}>
                  <p>Full heat map visualization coming soon</p>
                </div>
              </>
            ) : (
              <div className={styles.placeholderContent}>
                <Recycle size={48} className={styles.placeholderIcon} />
                <h3>Community Recycling Activity</h3>
                <p>Add div content here.</p>
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

  // Render the Impact Dashboard (Aggregated Analytics)
  const renderImpactDashboard = () => (
    <div className={styles.impactDashboard}>
      {/* Show loading overlay when data is being fetched */}
      {dataLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Updating data...</p>
        </div>
      )}
      
      {/* Time Range Selector */}
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

      {/* Key Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Recycle />
          </div>
          <div className={styles.metricContent}>
            <h3>{analyticsData.totalRecycled.toLocaleString()} kg</h3>
            <p>Total Recycled</p>
            <span className={`${styles.trend} ${getTrendClass(analyticsData.percentageChanges?.recycled)}`}>
              {analyticsData.percentageChanges?.recycled || '+0%'} from last {selectedTimeRange}
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Heart />
          </div>
          <div className={styles.metricContent}>
            <h3>{analyticsData.totalInitiatives}</h3>
            <p>Active Initiatives</p>
            <span className={`${styles.trend} ${getTrendClass(analyticsData.percentageChanges?.initiatives)}`}>
              {analyticsData.percentageChanges?.initiatives || '+0%'} from last {selectedTimeRange}
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Users />
          </div>
          <div className={styles.metricContent}>
            <h3>{analyticsData.activeUsers.toLocaleString()}</h3>
            <p>Active Users</p>
            <span className={`${styles.trend} ${getTrendClass(analyticsData.percentageChanges?.users)}`}>
              {analyticsData.percentageChanges?.users || '+0%'} growth
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Package />
          </div>
          <div className={styles.metricContent}>
            <h3>{analyticsData.totalPickups}</h3>
            <p>Successful Pickups</p>
            <span className={`${styles.trend} ${getTrendClass(analyticsData.percentageChanges?.pickups)}`}>
              {analyticsData.percentageChanges?.pickups || '+0%'} completion
            </span>
          </div>
        </div>
      </div>

      {/* Environmental Impact */}
      <div className={styles.impactSection}>
        <h3>Environmental Impact</h3>
        <div className={styles.impactGrid}>
          <div className={styles.impactCard}>
            <Leaf className={styles.impactIcon} />
            <h4>{analyticsData.communityImpact.co2Saved.toLocaleString()} kg</h4>
            <p>CO₂ Emissions Saved</p>
          </div>
          <div className={styles.impactCard}>
            <Trees className={styles.impactIcon} />
            <h4>{analyticsData.communityImpact.treesEquivalent}</h4>
            <p>Trees Equivalent</p>
          </div>
          <div className={styles.impactCard}>
            <Droplets className={styles.impactIcon} />
            <h4>{analyticsData.communityImpact.waterSaved.toLocaleString()} L</h4>
            <p>Water Saved</p>
          </div>
        </div>
      </div>

      {/* Charts Container */}
      <div className={styles.chartsContainer}>
        {/* Waste Distribution Chart */}
        <div className={styles.chartCard}>
          <h3>Waste Distribution by Type</h3>
          <div className={styles.wasteDistribution}>
            {Object.entries(analyticsData.wasteByType).map(([type, percentage]) => (
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
            ))}
          </div>
        </div>

        {/* Top Collectors Leaderboard */}
        <div className={styles.chartCard}>
          <h3>Top Collectors</h3>
          <div className={styles.leaderboard}>
            {analyticsData.topCollectors.map((collector, index) => (
              <div key={index} className={styles.leaderboardItem}>
                <div className={styles.rank}>
                  <Trophy className={`${styles.trophy} ${styles[collector.badge]}`} />
                  <span>#{index + 1}</span>
                </div>
                <div className={styles.collectorInfo}>
                  <h4>{collector.name}</h4>
                  <p>{collector.amount.toLocaleString()} kg collected</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recycling Trends Chart */}
      <div className={styles.trendsSection}>
        <h3>Recycling Trends - {getTimeRangeLabel()}</h3>
        <div className={styles.trendsChart}>
          <div className={styles.chartBars}>
            {analyticsData.recyclingTrends && analyticsData.recyclingTrends.length > 0 ? (
              <>
                {(() => {
                  const maxAmount = Math.max(...analyticsData.recyclingTrends.map(t => t.amount || 0), 1);
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
                          <span className={styles.barValue}>{trend.amount} kg</span>
                        </div>
                      </div>
                      <span className={styles.barLabel}>{trend.month}</span>
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

      {/* Call to Action Section */}
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
      {/* Welcome Section with User Stats */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeHeader}>
          <div>
            <h1 className={styles.welcomeTitle}>Welcome back, {user.firstName}!</h1>
            <p className={styles.welcomeSubtitle}>
              Here's what's happening with your recycling activities
            </p>
          </div>
          <div className={styles.userQuickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{analyticsData.userStats.totalPosts}</span>
              <span className={styles.quickStatLabel}>Your Posts</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{analyticsData.userStats.activePickups}</span>
              <span className={styles.quickStatLabel}>Active Pickups</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>{analyticsData.userStats.totalPoints}</span>
              <span className={styles.quickStatLabel}>Points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section with Tabs */}
      <div className={styles.analyticsSection}>
        {/* User-Friendly Navigation Tabs */}
        <div className={styles.navTabs}>
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
          <button
            className={`${styles.navTab} ${activeTab === 'impact' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('impact')}
          >
            <TrendingUp size={18} /> Impact & Stats
          </button>
        </div>

        {/* Tab Content Area */}
        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>

      {/* Quick Actions */}
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

export default Dashboard;