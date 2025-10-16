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

  // Get welcome message based on user role
  const getWelcomeMessage = () => {
    if (user.isAdmin) {
      return 'Monitor platform performance and manage the community';
    } else if (user.isCollector && user.isOrganization) {
      return 'Manage your organization\'s initiatives and collections';
    } else if (user.isCollector) {
      return 'View your collection activity and claim new posts';
    } else if (user.isOrganization) {
      return 'Manage your organization\'s recycling initiatives';
    } else {
      return 'Here\'s what\'s happening with your recycling activities';
    }
  };

  // Render quick stats based on user role
  const renderQuickStats = () => {
    if (user.isAdmin) {
      return (
        <>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.activeUsers}</span>
            <span className={styles.quickStatLabel}>Active Users</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.totalPosts}</span>
            <span className={styles.quickStatLabel}>Total Posts</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.totalPickups}</span>
            <span className={styles.quickStatLabel}>Pickups</span>
          </div>
        </>
      );
    } else if (user.isCollector) {
      return (
        <>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.userStats.activePickups}</span>
            <span className={styles.quickStatLabel}>Active Pickups</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.userStats.completedPickups}</span>
            <span className={styles.quickStatLabel}>Completed</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{user.points || 0}</span>
            <span className={styles.quickStatLabel}>Points</span>
          </div>
        </>
      );
    } else {
      return (
        <>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.userStats.totalPosts}</span>
            <span className={styles.quickStatLabel}>My Posts</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.userStats.completedPickups}</span>
            <span className={styles.quickStatLabel}>Completed</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{user.points || 0}</span>
            <span className={styles.quickStatLabel}>Points</span>
          </div>
        </>
      );
    }
  };

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

  // Render role-specific dashboard sections
  const renderRoleSpecificContent = () => {
    if (user.isAdmin) {
      return renderAdminDashboard();
    } else if (user.isCollector && user.isOrganization) {
      return renderOrgCollectorDashboard();
    } else if (user.isCollector) {
      return renderCollectorDashboard();
    } else if (user.isOrganization) {
      return renderOrganizationDashboard();
    } else {
      return renderGiverDashboard();
    }
  };

  // Admin Dashboard - Platform-wide management
  const renderAdminDashboard = () => (
    <div className={styles.adminDashboard}>
      <h3 className={styles.sectionTitle}>
        <Users className={styles.sectionIcon} />
        Platform Management
      </h3>
      
      <div className={styles.adminGrid}>
        {/* User Management Card */}
        <div className={styles.adminCard} onClick={() => navigate('/admin/users')}>
          <div className={styles.adminCardHeader}>
            <Users className={styles.adminCardIcon} />
            <h4>User Management</h4>
          </div>
          <div className={styles.adminCardStats}>
            <div className={styles.adminStat}>
              <span className={styles.adminStatValue}>{analyticsData.activeUsers}</span>
              <span className={styles.adminStatLabel}>Total Users</span>
            </div>
          </div>
          <button className={styles.adminCardButton}>Manage Users</button>
        </div>

        {/* Application Approvals Card */}
        <div className={styles.adminCard} onClick={() => navigate('/admin/approvals')}>
          <div className={styles.adminCardHeader}>
            <Package className={styles.adminCardIcon} />
            <h4>Pending Approvals</h4>
          </div>
          <div className={styles.adminCardStats}>
            <div className={styles.adminStat}>
              <span className={styles.adminStatValue}>
                {analyticsData.pendingApplications || 0}
              </span>
              <span className={styles.adminStatLabel}>Applications</span>
            </div>
          </div>
          <button className={styles.adminCardButton}>Review Applications</button>
        </div>

        {/* Platform Statistics Card */}
        <div className={styles.adminCard}>
          <div className={styles.adminCardHeader}>
            <TrendingUp className={styles.adminCardIcon} />
            <h4>Platform Statistics</h4>
          </div>
          <div className={styles.adminCardStats}>
            <div className={styles.adminStat}>
              <span className={styles.adminStatValue}>{analyticsData.totalRecycled} kg</span>
              <span className={styles.adminStatLabel}>Total Recycled</span>
            </div>
            <div className={styles.adminStat}>
              <span className={styles.adminStatValue}>{analyticsData.totalPickups}</span>
              <span className={styles.adminStatLabel}>Total Pickups</span>
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className={styles.adminCard}>
          <div className={styles.adminCardHeader}>
            <Heart className={styles.adminCardIcon} />
            <h4>System Health</h4>
          </div>
          <div className={styles.adminCardStats}>
            <div className={styles.adminStat}>
              <span className={`${styles.adminStatValue} ${styles.healthy}`}>Active</span>
              <span className={styles.adminStatLabel}>Status</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Collector Dashboard - Collection & Initiative management
  const renderCollectorDashboard = () => (
    <div className={styles.collectorDashboard}>
      <h3 className={styles.sectionTitle}>
        <Package className={styles.sectionIcon} />
        Collection Activity
      </h3>
      
      <div className={styles.collectorGrid}>
        {/* Active Collections */}
        <div className={styles.collectorCard}>
          <div className={styles.collectorCardHeader}>
            <h4>Active Collections</h4>
            <span className={styles.badge}>{analyticsData.userStats.activePickups || 0}</span>
          </div>
          <div className={styles.collectorStats}>
            <div className={styles.statRow}>
              <span>Pending Coordination</span>
              <span className={styles.statValue}>
                {analyticsData.userStats.pendingPickups || 0}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Scheduled Today</span>
              <span className={styles.statValue}>
                {analyticsData.userStats.scheduledToday || 0}
              </span>
            </div>
          </div>
          <button 
            className={styles.collectorButton}
            onClick={() => navigate('/pickups')}
          >
            View All Pickups
          </button>
        </div>

        {/* Collection Performance */}
        <div className={styles.collectorCard}>
          <div className={styles.collectorCardHeader}>
            <h4>Performance</h4>
            <Trophy className={styles.performanceIcon} />
          </div>
          <div className={styles.performanceStats}>
            <div className={styles.perfStat}>
              <span className={styles.perfLabel}>Total Collected</span>
              <span className={styles.perfValue}>
                {analyticsData.userStats.totalCollected || 0} kg
              </span>
            </div>
            <div className={styles.perfStat}>
              <span className={styles.perfLabel}>Completion Rate</span>
              <span className={styles.perfValue}>
                {analyticsData.userStats.completionRate || 0}%
              </span>
            </div>
            <div className={styles.perfStat}>
              <span className={styles.perfLabel}>Rating</span>
              <span className={styles.perfValue}>
                ⭐ {analyticsData.userStats.rating || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Available Claims */}
        <div className={styles.collectorCard}>
          <div className={styles.collectorCardHeader}>
            <h4>Available Posts</h4>
          </div>
          <div className={styles.availablePosts}>
            <p>New recyclable posts in your area</p>
            <span className={styles.availableCount}>
              {analyticsData.availablePosts || 0} posts
            </span>
          </div>
          <button 
            className={styles.collectorButton}
            onClick={() => navigate('/posts?type=Waste&status=Available')}
          >
            Browse Available Posts
          </button>
        </div>
      </div>
    </div>
  );

  // Organization Dashboard - Initiative management
  const renderOrganizationDashboard = () => (
    <div className={styles.organizationDashboard}>
      <h3 className={styles.sectionTitle}>
        <Heart className={styles.sectionIcon} />
        Organization Initiatives
      </h3>
      
      <div className={styles.orgGrid}>
        {/* Active Initiatives */}
        <div className={styles.orgCard}>
          <div className={styles.orgCardHeader}>
            <h4>Active Initiatives</h4>
            <span className={styles.badge}>
              {analyticsData.userStats.activeInitiatives || 0}
            </span>
          </div>
          <div className={styles.orgStats}>
            <div className={styles.statRow}>
              <span>Total Supporters</span>
              <span className={styles.statValue}>
                {analyticsData.userStats.totalSupporters || 0}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Materials Received</span>
              <span className={styles.statValue}>
                {analyticsData.userStats.materialsReceived || 0} kg
              </span>
            </div>
          </div>
          <button 
            className={styles.orgButton}
            onClick={() => navigate('/posts?type=Initiative')}
          >
            Manage Initiatives
          </button>
        </div>

        {/* Impact Metrics */}
        <div className={styles.orgCard}>
          <div className={styles.orgCardHeader}>
            <h4>Impact Metrics</h4>
            <Leaf className={styles.impactIconSmall} />
          </div>
          <div className={styles.impactMetrics}>
            <div className={styles.impactMetric}>
              <Trees size={24} />
              <div>
                <span className={styles.impactValue}>
                  {analyticsData.userStats.treesEquivalent || 0}
                </span>
                <span className={styles.impactLabel}>Trees Saved</span>
              </div>
            </div>
            <div className={styles.impactMetric}>
              <Droplets size={24} />
              <div>
                <span className={styles.impactValue}>
                  {analyticsData.userStats.waterSaved || 0}L
                </span>
                <span className={styles.impactLabel}>Water Saved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Create Initiative CTA */}
        <div className={styles.orgCard}>
          <div className={styles.orgCardHeader}>
            <h4>Start New Initiative</h4>
          </div>
          <p className={styles.orgDescription}>
            Create a new recycling initiative to engage the community
          </p>
          <button 
            className={`${styles.orgButton} ${styles.primary}`}
            onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
          >
            <Plus size={18} /> Create Initiative
          </button>
        </div>
      </div>
    </div>
  );

  // Combined Org+Collector Dashboard
  const renderOrgCollectorDashboard = () => (
    <div className={styles.combinedDashboard}>
      {renderCollectorDashboard()}
      {renderOrganizationDashboard()}
    </div>
  );

  // Giver Dashboard - Personal recycling activity
  const renderGiverDashboard = () => (
    <div className={styles.giverDashboard}>
      <h3 className={styles.sectionTitle}>
        <Recycle className={styles.sectionIcon} />
        My Recycling Activity
      </h3>
      
      <div className={styles.giverGrid}>
        {/* My Posts */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>My Posts</h4>
            <span className={styles.badge}>
              {analyticsData.userStats.totalPosts || 0}
            </span>
          </div>
          <div className={styles.giverStats}>
            <div className={styles.statRow}>
              <span>Active Posts</span>
              <span className={styles.statValue}>
                {analyticsData.userStats.activePosts || 0}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Awaiting Pickup</span>
              <span className={styles.statValue}>
                {analyticsData.userStats.awaitingPickup || 0}
              </span>
            </div>
          </div>
          <button 
            className={styles.giverButton}
            onClick={() => navigate('/posts?myPosts=true')}
          >
            View My Posts
          </button>
        </div>

        {/* Pickup History */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>Pickup History</h4>
            <Package className={styles.cardIcon} />
          </div>
          <div className={styles.pickupStats}>
            <div className={styles.pickupStat}>
              <span className={styles.pickupLabel}>Total Pickups</span>
              <span className={styles.pickupValue}>
                {analyticsData.userStats.completedPickups || 0}
              </span>
            </div>
            <div className={styles.pickupStat}>
              <span className={styles.pickupLabel}>Total Recycled</span>
              <span className={styles.pickupValue}>
                {analyticsData.userStats.totalRecycled || 0} kg
              </span>
            </div>
          </div>
        </div>

        {/* Points & Rewards */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>Points & Rewards</h4>
            <Trophy className={styles.cardIcon} />
          </div>
          <div className={styles.pointsDisplay}>
            <div className={styles.pointsMain}>
              <span className={styles.pointsValue}>{user.points || 0}</span>
              <span className={styles.pointsLabel}>Total Points</span>
            </div>
            <div className={styles.badgeDisplay}>
              {user.badges && user.badges.length > 0 ? (
                user.badges.map((badge, index) => (
                  <span key={index} className={styles.badgeItem}>
                    {badge}
                  </span>
                ))
              ) : (
                <p className={styles.noBadges}>No badges yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Impact Summary */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>My Impact</h4>
            <Leaf className={styles.cardIcon} />
          </div>
          <div className={styles.impactSummary}>
            <div className={styles.impactItem}>
              <Leaf size={20} />
              <span>{analyticsData.userStats.co2Saved || 0} kg CO₂ saved</span>
            </div>
            <div className={styles.impactItem}>
              <Trees size={20} />
              <span>{analyticsData.userStats.treesEquivalent || 0} trees equivalent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render quick action buttons based on user role
  const renderQuickActions = () => {
    const actions = [];
    
    // Common action for all users
    actions.push(
      <button 
        key="create-post"
        className={styles.actionButton}
        onClick={() => navigate('/create-post', { state: { postType: 'Waste' } })}
      >
        <Plus size={18} /> Post Recyclables
      </button>
    );

    if (user.isCollector) {
      actions.push(
        <button 
          key="browse-posts"
          className={styles.actionButton}
          onClick={() => navigate('/posts?type=Waste&status=Available')}
        >
          <Package size={18} /> Browse Available Posts
        </button>
      );
    }

    if (user.isOrganization || user.isCollector) {
      actions.push(
        <button 
          key="create-initiative"
          className={styles.actionButton}
          onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
        >
          <Heart size={18} /> Create Initiative
        </button>
      );
    }

    actions.push(
      <button 
        key="browse-community"
        className={styles.actionButtonSecondary}
        onClick={() => navigate('/posts')}
      >
        <Users size={18} /> Browse Community
      </button>
    );

    if (user.isAdmin) {
      actions.push(
        <button 
          key="admin-panel"
          className={styles.actionButton}
          onClick={() => navigate('/admin/users')}
        >
          <Users size={18} /> Admin Panel
        </button>
      );
    }

    return actions;
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
      {/* Welcome Section */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeHeader}>
          <div>
            <h1 className={styles.welcomeTitle}>
              Welcome back, {user.firstName}!
            </h1>
            <p className={styles.welcomeSubtitle}>
              {getWelcomeMessage()}
            </p>
          </div>
          <div className={styles.userQuickStats}>
            {renderQuickStats()}
          </div>
        </div>
      </div>

      {/* Role-Based Analytics Section */}
      <div className={styles.analyticsSection}>
        {/* Navigation Tabs */}
        <div className={styles.navTabs}>
          <button 
            className={`${styles.navTab} ${activeTab === 'impact' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('impact')}
          >
            <TrendingUp size={18} />
            {user.isAdmin ? 'Platform Overview' : 'My Impact'}
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'activity' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Recycle size={18} />
            Community Activity
          </button>
          <button 
            className={`${styles.navTab} ${activeTab === 'nearby' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            <MapPin size={18} />
            Nearby Sites
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {renderTabContent()}
        </div>
      </div>

      {/* Role-Specific Section */}
      <div className={styles.roleSpecificSection}>
        {renderRoleSpecificContent()}
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
        <div className={styles.actionButtonsGrid}>
          {renderQuickActions()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;