import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PostsAnalytics from '../../analytics/PostsAnalytics/PostsAnalytics';
import PostDetails from '../../posts/PostDetails/PostDetails';
import styles from './RightSection.module.css';

const RightSection = ({ user, data }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1200);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset to collapsed when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [location.pathname, isMobile]);

  const renderSectionContent = () => {
    // Check if we're on a single post page
    if (location.pathname.startsWith('/posts/') && location.pathname !== '/posts/') {
      return (
        <PostDetails
          post={data?.post}
          user={user}
          onViewSupports={data?.onViewSupports}
          likeCount={data?.likeCount}
          isLiked={data?.isLiked}
          onLikeToggle={data?.onLikeToggle}
          likingPost={data?.likingPost}
        />
      );
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

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <section className={`${styles.rightSection} ${isMobile && isCollapsed ? styles.collapsed : ''}`}>
      {isMobile && (
        <button
          className={styles.toggleHandle}
          onClick={handleToggle}
          aria-label={isCollapsed ? "Expand details" : "Collapse details"}
        >
          <div className={styles.handleBar}></div>
          <span className={styles.handleText}>
            {isCollapsed ? '▲ Post Details' : '▼ Hide Details'}
          </span>
        </button>
      )}
      <div className={styles.rightSectionContainer}>
        {content}
      </div>
    </section>
  );
};

export default RightSection;