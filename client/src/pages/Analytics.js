import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Analytics.module.css';
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
  }, [user, selectedTimeRange]);

  useEffect(() => {
    if (activeTab === 'activity' && user) {
      fetchHeatMapData();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'nearby' && user) {
      fetchDisposalSites();
    }
  }, [activeTab, user]);

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
      
      const response = await axios.get(
        `http://localhost:3001/api/analytics/dashboard?timeRange=${selectedTimeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.data) {
        setAnalyticsData(response.data.data);
        console.log('Analytics data loaded:', response.data.data);
      } else {
        setError('Failed to load analytics data');
        console.error('API response:', response.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.response?.data?.message || 'Failed to fetch analytics');
      
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
      setDisposalSites([
        { id: 1, name: 'Green Earth MRF', distance: '1.2 km', types: ['Plastic', 'Paper'], active: true },
        { id: 2, name: 'City Recycling Center', distance: '2.5 km', types: ['All types'], active: true },
        { id: 3, name: 'E-Waste Hub', distance: '3.8 km', types: ['Electronics'], active: true }
      ]);
    }
  };

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
                  <p>Showing {disposalSites.length} disposal sites near you.</p>
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
                <p>Loading nearby disposal sites...</p>
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
              <span className={styles.quickStatValue}>
                {analyticsData?.userStats?.totalPosts || 0}
              </span>
              <span className={styles.quickStatLabel}>Your Posts</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.userStats?.activePickups || 0}
              </span>
              <span className={styles.quickStatLabel}>Active Pickups</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatValue}>
                {analyticsData?.userStats?.totalPoints || 0}
              </span>
              <span className={styles.quickStatLabel}>Points</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.analyticsSection}>
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