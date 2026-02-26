import { useCallback, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PostCard from '../components/posts/PostCard/PostCard';
import WastePostsMap from '../components/posts/WastePostsMap/WastePostsMap';
import LocationFilter from '../components/analytics/LocationFilter';
import GuideLink from '../components/guide/GuideLink';
import { useAuth } from '../context/AuthContext';
import { List, Map, CalendarDays } from 'lucide-react';
import styles from './Posts.module.css';

const Posts = ({ activeFilter = 'all', onPostCountsUpdate, onDataUpdate }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const [locationFilter, setLocationFilter] = useState({
    region: null,
    province: null,
    city: null,
    barangay: null
  });

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [groupByDate, setGroupByDate] = useState(false);

  // Reset view mode to list when switching away from collector-relevant filters
  const isCollectorFilter = activeFilter === 'Claimable' || activeFilter === 'Waste';
  const prevFilterRef = useRef(activeFilter);
  useEffect(() => {
    if (prevFilterRef.current !== activeFilter) {
      if (!isCollectorFilter) {
        setViewMode('list');
        setGroupByDate(false);
      }
      prevFilterRef.current = activeFilter;
    }
  }, [activeFilter, isCollectorFilter]);

  // Check if we received location state from navigation (from heatmap)
  useEffect(() => {
    if (location.state?.locationFilter) {
      setLocationFilter(location.state.locationFilter);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleLocationFilterChange = useCallback((newFilter) => {
    setLocationFilter(newFilter);
  }, []);

  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate({
        onLocationFilterChange: handleLocationFilterChange
      });
    }
  }, [onDataUpdate, handleLocationFilterChange]);

  const handleCountsUpdate = useCallback((counts) => {
    if (onPostCountsUpdate) {
      onPostCountsUpdate(counts);
    }
  }, [onPostCountsUpdate]);

  const getPostTypeFromFilter = (filter) => {
    switch(filter) {
      case 'Claimable': return 'Claimable';
      case 'Waste': return 'Waste';
      case 'Initiatives': return 'Initiative';
      case 'Forum': return 'Forum';
      case 'myPosts': return 'all';
      case 'all':
      default: return 'all';
    }
  };

  const postType = getPostTypeFromFilter(activeFilter);
  const userID = activeFilter === 'myPosts' ? currentUser?.userID : null;

  return (
    <div>
      {/* Location Filter */}
      <LocationFilter
        onFilterChange={handleLocationFilterChange}
        currentFilter={locationFilter}
        userLocation={currentUser?.userLocation}
      />

      {/* Getting Started Guide Link */}
      <div style={{ textAlign: 'center', margin: '-0.25rem 0 0.75rem 0' }}>
        <GuideLink text="Don't know where to start? Click here!" targetPage={4} />
      </div>

      {/* Collector view controls — only on Claimable / Waste filters */}
      {isCollectorFilter && (
        <div className={styles.collectorControls}>
          {/* View mode toggle */}
          <div className={styles.viewToggleGroup}>
            <button
              onClick={() => setViewMode('list')}
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
            >
              <List size={14} /> List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`${styles.viewToggleBtn} ${viewMode === 'map' ? styles.active : ''}`}
            >
              <Map size={14} /> Map View
            </button>
          </div>

          {/* Group by date toggle — only in list mode */}
          {viewMode === 'list' && (
            <button
              onClick={() => setGroupByDate(prev => !prev)}
              className={`${styles.groupByDateBtn} ${groupByDate ? styles.active : ''}`}
            >
              <CalendarDays size={14} />
              {groupByDate ? 'Grouped by Date' : 'Group by Date'}
            </button>
          )}
        </div>
      )}

      {/* Map view */}
      {viewMode === 'map' && isCollectorFilter ? (
        <WastePostsMap
          locationFilter={locationFilter}
          currentUserID={currentUser?.userID}
          postType={postType}
        />
      ) : (
        <PostCard
          postType={postType}
          userID={userID}
          maxPosts={20}
          onCountsUpdate={handleCountsUpdate}
          currentUserID={currentUser?.userID}
          locationFilter={locationFilter}
          groupByDate={isCollectorFilter ? groupByDate : false}
        />
      )}
    </div>
  );
};

export default Posts;
