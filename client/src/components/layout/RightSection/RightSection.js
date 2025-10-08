import React from 'react';
import { useLocation } from 'react-router-dom';
import PostsAnalytics from '../../analytics/PostsAnalytics/PostsAnalytics';
import PostDetails from '../../posts/PostDetails/PostDetails';
import styles from './RightSection.module.css';

const RightSection = ({ user, data }) => {
  const location = useLocation();

  const renderSectionContent = () => {
    // Check if we're on a single post page
    if (location.pathname.startsWith('/posts/') && location.pathname !== '/posts/') {
      return <PostDetails post={data?.post} user={user} />;
    }
    
    switch (location.pathname) {
      case '/posts':
        return <PostsAnalytics data={data} user={user} />;

      case '/create-post':
        return <PostsAnalytics data={data} user={user} />;
      
      default:
        return null;
    }
  };

  const content = renderSectionContent();
  
  // Don't render if no content for this page
  if (!content) return null;

  return (
    <section className={styles.rightSection}>
      <div className={styles.rightSectionContainer}>
        {content}
      </div>
    </section>   
  );
};

export default RightSection;