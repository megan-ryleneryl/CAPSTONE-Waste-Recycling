import { useCallback, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PostCard from '../components/posts/PostCard/PostCard';
import LocationFilter from '../components/analytics/LocationFilter';
import GuideLink from '../components/guide/GuideLink';
import { useAuth } from '../context/AuthContext';

const Posts = ({ activeFilter = 'all', onPostCountsUpdate, onDataUpdate }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  // Location filter state
  const [locationFilter, setLocationFilter] = useState({
    region: null,
    province: null,
    city: null,
    barangay: null
  });

  // Check if we received location state from navigation (from heatmap)
  useEffect(() => {
    if (location.state?.locationFilter) {
      setLocationFilter(location.state.locationFilter);
      // Clear the state after using it
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Memoized callback to prevent infinite loops
  const handleLocationFilterChange = useCallback((newFilter) => {
    setLocationFilter(newFilter);
  }, []);

  // Pass the location filter handler to RightSection via onDataUpdate
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate({
        onLocationFilterChange: handleLocationFilterChange
      });
    }
  }, [onDataUpdate, handleLocationFilterChange]);

  // Memoize the counts update handler to prevent infinite loops
  const handleCountsUpdate = useCallback((counts) => {
    if (onPostCountsUpdate) {
      onPostCountsUpdate(counts);
    }
  }, [onPostCountsUpdate]);

  // Map filter IDs from SideNav to PostCard postType values
  const getPostTypeFromFilter = (filter) => {
    switch(filter) {
      case 'Claimable':
        return 'Claimable';
      case 'Waste':
        return 'Waste';
      case 'Initiatives':
        return 'Initiative';
      case 'Forum':
        return 'Forum';
      case 'myPosts':
        // For "My Posts", we still pass 'all' but with userID
        return 'all';
      case 'all':
      default:
        return 'all';
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

      {/* Pass the appropriate postType, userID, and locationFilter to PostCard */}
      <PostCard
        postType={postType}
        userID={userID}
        maxPosts={20}
        onCountsUpdate={handleCountsUpdate}
        currentUserID={currentUser?.userID}
        locationFilter={locationFilter}
      />
    </div>
  );
};

export default Posts;