import React from 'react';
import PostCard from '../components/posts/PostCard/PostCard';
import { useAuth } from '../context/AuthContext';

const Posts = ({ activeFilter = 'all' }) => {
  const { currentUser } = useAuth();
  
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

  return (
    <div>
      {/* Pass the appropriate postType and userID to PostCard */}
      <PostCard 
        postType={postType} 
        userID={userID}
        maxPosts={20} 
      />
    </div>
  );
};

export default Posts;