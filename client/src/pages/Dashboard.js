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
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Analytics data state - will be populated from API
  const [analyticsData, setAnalyticsData] = useState({
    // Platform-wide stats (for admins)
    totalRecycled: 0,
    totalInitiatives: 0,
    activeUsers: 0,
    totalPickups: 0,
    pendingApplications: 0,
    
    // Giver-specific stats (all users)
    giverStats: {
      totalKgRecycled: 0,
      activePickups: 0,
      successfulPickups: 0,
      activeForumPosts: 0,
      totalPoints: 0
    },
    
    // Collector-specific stats
    collectorStats: {
      activeWastePosts: 0,
      claimedPosts: 0,
      totalCollected: 0,
      completionRate: 0
    },
    
    // Organization-specific stats
    organizationStats: {
      activeInitiatives: 0,
      totalSupporters: 0,
      materialsReceived: 0,
      topContributors: []
    },
    
    // Keep existing fields for backward compatibility
    communityImpact: {
      co2Saved: 0,
      treesEquivalent: 0,
      waterSaved: 0
    }
  });

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

  // Render quick stats
  const renderQuickStats = () => {
    if (user.isAdmin) {
      return (
        <>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.activeUsers}</span>
            <span className={styles.quickStatLabel}>Active Users</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.pendingApplications || 0}</span>
            <span className={styles.quickStatLabel}>Pending Approvals</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{analyticsData.totalRecycled} kg</span>
            <span className={styles.quickStatLabel}>Total Recycled</span>
          </div>
        </>
      );
    }
    
    // All users see their Giver stats
    return (
      <>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>{analyticsData.giverStats.totalKgRecycled} kg</span>
          <span className={styles.quickStatLabel}>Recycled</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>{analyticsData.giverStats.activePickups}</span>
          <span className={styles.quickStatLabel}>Active Pickups</span>
        </div>
        <div className={styles.quickStat}>
          <span className={styles.quickStatValue}>{analyticsData.giverStats.totalPoints}</span>
          <span className={styles.quickStatLabel}>Points</span>
        </div>
      </>
    );
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

  // Render role-specific dashboard sections
  const renderRoleSpecificContent = () => {
    // Always render Giver section for all users
    const giverSection = renderGiverDashboard();
    
    // Add role-specific sections
    if (user.isAdmin) {
      return (
        <>
          {renderAdminDashboard()}
          {giverSection}
        </>
      );
    } else if (user.isOrganization && user.isCollector) {
      return (
        <>
          {renderOrganizationDashboard()}
          {renderCollectorDashboard()}
          {giverSection}
        </>
      );
    } else if (user.isOrganization) {
      return (
        <>
          {renderOrganizationDashboard()}
          {giverSection}
        </>
      );
    } else if (user.isCollector) {
      return (
        <>
          {renderCollectorDashboard()}
          {giverSection}
        </>
      );
    } else {
      return giverSection;
    }
  };

  // Admin Dashboard
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

        {/* Material Management Card */}
        <div className={styles.adminCard} onClick={() => navigate('/admin/edit-materials')}>
          <div className={styles.adminCardHeader}>
            <Recycle className={styles.adminCardIcon} />
            <h4>Material Management</h4>
          </div>
          <div className={styles.adminCardStats}>
            <div className={styles.adminStat}>
              <span className={styles.adminStatLabel}>Manage recyclable material types</span>
            </div>
          </div>
          <button className={styles.adminCardButton}>Edit Materials</button>
        </div>
      </div>
    </div>
  );

  // Collector Dashboard
  const renderCollectorDashboard = () => (
    <div className={styles.collectorDashboard}>
      <h3 className={styles.sectionTitle}>
        <Package className={styles.sectionIcon} />
        Collector Dashboard
      </h3>
      
      <div className={styles.collectorGrid}>
        {/* Active Waste Posts Card */}
        <div className={styles.collectorCard}>
          <div className={styles.collectorCardHeader}>
            <h4>Available Waste Posts</h4>
            <Package className={styles.cardIcon} />
          </div>
          <div className={styles.collectorStats}>
            <div className={styles.availablePosts}>
              <span className={styles.availableCount}>
                {analyticsData.collectorStats.activeWastePosts || 0}
              </span>
              <span className={styles.statLabel}>Posts ready to claim</span>
            </div>
          </div>
          <button 
            className={styles.collectorButton}
            onClick={() => navigate('/posts', { state: { filter: 'waste' } })}
          >
            <Plus size={18} /> Browse Waste Posts
          </button>
        </div>

        {/* Collection Performance Card */}
        <div className={styles.collectorCard}>
          <div className={styles.collectorCardHeader}>
            <h4>Collection Performance</h4>
            <TrendingUp className={styles.performanceIcon} />
          </div>
          <div className={styles.performanceStats}>
            <div className={styles.perfStat}>
              <span className={styles.perfLabel}>Posts Claimed</span>
              <span className={styles.perfValue}>
                {analyticsData.collectorStats.claimedPosts || 0}
              </span>
            </div>
            <div className={styles.perfStat}>
              <span className={styles.perfLabel}>Total Collected</span>
              <span className={styles.perfValue}>
                {analyticsData.collectorStats.totalCollected || 0} kg
              </span>
            </div>
            <div className={styles.perfStat}>
              <span className={styles.perfLabel}>Completion Rate</span>
              <span className={styles.perfValue}>
                {analyticsData.collectorStats.completionRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className={styles.collectorCard}>
          <div className={styles.collectorCardHeader}>
            <h4>Quick Actions</h4>
          </div>
          <div className={styles.collectorStats}>
            <button 
              className={styles.collectorButton}
              onClick={() => navigate('/pickups')}
            >
              View My Pickups
            </button>
            <button 
              className={styles.collectorButton}
              onClick={() => navigate('/posts')}
              style={{ marginTop: '0.5rem' }}
            >
              Browse All Posts
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Organization Dashboard
  const renderOrganizationDashboard = () => (
    <div className={styles.organizationDashboard}>
      <h3 className={styles.sectionTitle}>
        <Heart className={styles.sectionIcon} />
        Organization Dashboard
      </h3>
      
      <div className={styles.orgGrid}>
        {/* Active Initiatives Card */}
        <div className={styles.orgCard}>
          <div className={styles.orgCardHeader}>
            <h4>Your Initiatives</h4>
            <Heart className={styles.impactIconSmall} />
          </div>
          <div className={styles.orgStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Active Initiatives</span>
              <span className={styles.statValue}>
                {analyticsData.organizationStats.activeInitiatives || 0}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Supporters</span>
              <span className={styles.statValue}>
                {analyticsData.organizationStats.totalSupporters || 0}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Materials Received</span>
              <span className={styles.statValue}>
                {analyticsData.organizationStats.materialsReceived || 0} kg
              </span>
            </div>
          </div>
          <button 
            className={`${styles.orgButton} ${styles.primary}`}
            onClick={() => navigate('/create-post', { state: { postType: 'Initiative' } })}
          >
            <Plus size={18} /> Create Initiative
          </button>
        </div>

        {/* Top Contributors Card */}
        <div className={styles.orgCard}>
          <div className={styles.orgCardHeader}>
            <h4>Top Contributors</h4>
            <Trophy className={styles.impactIconSmall} />
          </div>
          {analyticsData.organizationStats.topContributors && 
          analyticsData.organizationStats.topContributors.length > 0 ? (
            <div className={styles.contributorsList}>
              {analyticsData.organizationStats.topContributors.slice(0, 5).map((contributor, index) => (
                <div key={index} className={styles.contributorItem}>
                  <div className={styles.contributorRank}>#{index + 1}</div>
                  <div className={styles.contributorInfo}>
                    <span className={styles.contributorName}>{contributor.name}</span>
                    <span className={styles.contributorAmount}>
                      {contributor.amount} kg donated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.orgDescription}>
              <p>No contributors yet. Promote your initiatives to attract supporters!</p>
            </div>
          )}
          <button 
            className={styles.orgButton}
            onClick={() => navigate('/posts', { state: { filter: 'initiatives', org: user.id } })}
          >
            View All Initiatives
          </button>
        </div>

        {/* Impact Metrics Card */}
        <div className={styles.orgCard}>
          <div className={styles.orgCardHeader}>
            <h4>Your Impact</h4>
            <Leaf className={styles.impactIconSmall} />
          </div>
          <div className={styles.impactMetrics}>
            <div className={styles.impactMetric}>
              <Leaf size={24} />
              <div>
                <span className={styles.impactValue}>
                  {analyticsData.communityImpact.co2Saved || 0} kg
                </span>
                <span className={styles.impactLabel}>CO₂ Saved</span>
              </div>
            </div>
            <div className={styles.impactMetric}>
              <Trees size={24} />
              <div>
                <span className={styles.impactValue}>
                  {analyticsData.communityImpact.treesEquivalent || 0}
                </span>
                <span className={styles.impactLabel}>Trees Equivalent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Giver Dashboard
  const renderGiverDashboard = () => (
    <div className={styles.giverDashboard}>
      <h3 className={styles.sectionTitle}>
        <Recycle className={styles.sectionIcon} />
        {user.isCollector || user.isOrganization ? 'Your Recycling Activity' : 'Your Dashboard'}
      </h3>
      
      <div className={styles.giverGrid}>
        {/* Recycling Stats Card */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>Recycling Stats</h4>
            <Recycle className={styles.cardIcon} />
          </div>
          <div className={styles.giverStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Recycled</span>
              <span className={styles.statValue}>
                {analyticsData.giverStats.totalKgRecycled || 0} kg
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Successful Pickups</span>
              <span className={styles.statValue}>
                {analyticsData.giverStats.successfulPickups || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Active Pickups Card */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>Pickup Status</h4>
            <Package className={styles.cardIcon} />
          </div>
          <div className={styles.pickupStats}>
            <div className={styles.pickupStat}>
              <span className={styles.pickupLabel}>Active Pickups</span>
              <span className={styles.pickupValue}>
                {analyticsData.giverStats.activePickups || 0}
              </span>
            </div>
          </div>
          <button 
            className={styles.giverButton}
            onClick={() => navigate('/pickups')}
          >
            Manage Pickups
          </button>
        </div>

        {/* Forum Activity Card */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>Community Engagement</h4>
            <Users className={styles.cardIcon} />
          </div>
          <div className={styles.giverStats}>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Active Forum Posts</span>
              <span className={styles.statValue}>
                {analyticsData.giverStats.activeForumPosts || 0}
              </span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total Points</span>
              <span className={styles.statValue}>
                {analyticsData.giverStats.totalPoints || 0}
              </span>
            </div>
          </div>
          <button 
            className={styles.giverButton}
            onClick={() => navigate('/create-post', { state: { postType: 'Forum' } })}
          >
            <Plus size={18} /> Create Forum Post
          </button>
        </div>

        {/* Environmental Impact Card */}
        <div className={styles.giverCard}>
          <div className={styles.giverCardHeader}>
            <h4>Your Impact</h4>
            <Leaf className={styles.cardIcon} />
          </div>
          <div className={styles.impactSummary}>
            <div className={styles.impactItem}>
              <Leaf size={20} />
              <div>
                <span className={styles.impactValue}>
                  {(analyticsData.giverStats.totalKgRecycled * 2.5).toFixed(1)} kg
                </span>
                <span className={styles.impactLabel}>CO₂ Saved</span>
              </div>
            </div>
            <div className={styles.impactItem}>
              <Trees size={20} />
              <div>
                <span className={styles.impactValue}>
                  {Math.floor(analyticsData.giverStats.totalKgRecycled / 10)}
                </span>
                <span className={styles.impactLabel}>Trees Equivalent</span>
              </div>
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
            Here's your recycling dashboard.
          </p>
        </div>
        <div className={styles.userQuickStats}>
          {renderQuickStats()}
        </div>
      </div>
    </div>

    {/* Role-Specific Dashboards */}
    <div className={styles.roleSpecificSection}>
      {renderRoleSpecificContent()}
    </div>
  </div>
);
};

export default Dashboard;