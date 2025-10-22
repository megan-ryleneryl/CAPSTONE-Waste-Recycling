import React from 'react';
import PostCard from '../components/posts/PostCard/PostCard';
import { useAuth } from '../context/AuthContext';

const Posts = ({ activeFilter = 'all', onPostCountsUpdate }) => {
  const { currentUser } = useAuth();

  const handleCountsUpdate = (counts) => {
    if (onPostCountsUpdate) {
      onPostCountsUpdate(counts);
    }
  };

  // Map filter IDs from SideNav to PostCard postType values
  const getPostTypeFromFilter = (filter) => {
    switch(filter) {
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

  console.log('Posts Component - activeFilter:', activeFilter);
  console.log('Posts Component - currentUser:', currentUser);
  console.log('Posts Component - userID being passed:', userID);
  console.log('Posts Component - postType being passed:', postType);

  return (
    <div>
      {/* Pass the appropriate postType and userID to PostCard */}
      <PostCard
        postType={postType}
        userID={userID}
        maxPosts={20}
        onCountsUpdate={handleCountsUpdate}
        currentUserID={currentUser?.userID}
      />
    </div>
  );
};

export default Posts;