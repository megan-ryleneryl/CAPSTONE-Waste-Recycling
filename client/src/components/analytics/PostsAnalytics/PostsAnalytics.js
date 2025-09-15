// client/src/components/analytics/PostsAnalytics/PostsAnalytics.js
import React, { useState, useEffect } from 'react';
import WasteChart from '../WasteChart/WasteChart';
import TopAreas from '../TopAreas/TopAreas';
import MaterialBreakdown from '../MaterialBreakdown/MaterialBreakdown';
import styles from './PostsAnalytics.module.css';

const PostsAnalytics = ({ data, user }) => {
  const [analyticsData, setAnalyticsData] = useState({
    totalWaste: 0,
    topAreas: [],
    topMaterial: {},
    recyclingTrends: []
  });

  useEffect(() => {
    // Process data from props or fetch analytics data
    if (data) {
      processAnalyticsData(data);
    } else {
      fetchAnalyticsData();
    }
  }, [data]);

  const processAnalyticsData = (posts) => {
    // Process posts data to generate analytics
    const totalWaste = posts.reduce((sum, post) => {
      return sum + (post.estimatedWeight || 0);
    }, 0);

    const areaCount = posts.reduce((acc, post) => {
      const area = post.location?.area || 'Unknown';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});

    const topAreas = Object.entries(areaCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([area, count]) => ({ area, count }));

    setAnalyticsData({
      totalWaste,
      topAreas,
      topMaterial: { type: 'Plastic', subtype: 'Electronics Glass' },
      recyclingTrends: []
    });
  };

  const fetchAnalyticsData = async () => {
    try {
      // Fetch analytics from your API
      // const response = await axios.get('/api/analytics/posts');
      // setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  return (
    <div className={styles.analyticsContainer}>
      <WasteChart 
        totalWaste={analyticsData.totalWaste}
        trends={analyticsData.recyclingTrends}
      />
      
      <TopAreas areas={analyticsData.topAreas} />
      
      <MaterialBreakdown material={analyticsData.topMaterial} />
    </div>
  );
};

export default PostsAnalytics;