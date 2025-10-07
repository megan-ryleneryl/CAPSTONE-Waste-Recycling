// PostList.js
import React from 'react';
// From any page in src/pages/
import PostCard from '../components/posts/PostCard/PostCard';

const PostList = () => {
  return (
    <div>
      
      {/* Show all posts */}
      <PostCard postType="all" maxPosts={20} />
      
      {/* Or filter by specific post type */}
      {/* <PostCard postType="Waste Post" maxPosts={10} /> */}
      {/* <PostCard postType="Initiative Post" maxPosts={10} /> */}
      {/* <PostCard postType="Forum Post" maxPosts={10} /> */}
    </div>
  );
};

export default PostList;