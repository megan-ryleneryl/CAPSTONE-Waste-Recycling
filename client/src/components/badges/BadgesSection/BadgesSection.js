import React, { useState, useMemo } from 'react';
import { Trophy, Filter, ChevronDown } from 'lucide-react';
import { BadgeCard } from '../index';
import { BADGES, BADGE_CATEGORIES, getAllBadgesSorted, getBadgesByCategory } from '../../../config/badges';
import './BadgesSection.css';

const BadgesSection = ({ userBadges = [], userStats = {} }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate progress for locked badges
  const calculateProgress = (badge) => {
    const req = badge.requirements;
    let progress = 0;
    let total = 0;

    if (req.minPoints && userStats.points !== undefined) {
      progress = (userStats.points / req.minPoints) * 100;
      total++;
    }
    if (req.minPostsCreated && userStats.postsCreated !== undefined) {
      progress += (userStats.postsCreated / req.minPostsCreated) * 100;
      total++;
    }
    if (req.minPickupsCompleted && userStats.pickupsCompleted !== undefined) {
      progress += (userStats.pickupsCompleted / req.minPickupsCompleted) * 100;
      total++;
    }
    if (req.minKgRecycled && userStats.kgRecycled !== undefined) {
      progress += (userStats.kgRecycled / req.minKgRecycled) * 100;
      total++;
    }
    if (req.minInitiativesSupported && userStats.initiativesSupported !== undefined) {
      progress += (userStats.initiativesSupported / req.minInitiativesSupported) * 100;
      total++;
    }

    return total > 0 ? Math.min(progress / total, 100) : 0;
  };

  // Get filtered badges
  const filteredBadges = useMemo(() => {
    let badges = getAllBadgesSorted();

    if (activeFilter === 'earned') {
      badges = badges.filter(badge =>
        userBadges.some(ub => ub.badgeId === badge.id)
      );
    } else if (activeFilter === 'locked') {
      badges = badges.filter(badge =>
        !userBadges.some(ub => ub.badgeId === badge.id)
      );
    } else if (activeFilter !== 'all') {
      badges = getBadgesByCategory(activeFilter);
    }

    return badges;
  }, [activeFilter, userBadges]);

  // Count earned badges
  const earnedCount = userBadges.length;
  const totalCount = Object.keys(BADGES).length;

  const filters = [
    { id: 'all', label: 'All Badges' },
    { id: 'earned', label: 'Earned' },
    { id: 'locked', label: 'Locked' },
    { id: BADGE_CATEGORIES.RECYCLING, label: 'Recycling' },
    { id: BADGE_CATEGORIES.MILESTONE, label: 'Milestones' },
    { id: BADGE_CATEGORIES.COMMUNITY, label: 'Community' },
    { id: BADGE_CATEGORIES.SPECIAL, label: 'Special' },
  ];

  return (
    <div className="badges-section">
      {/* Header */}
      <div className="badges-header">
        <div className="badges-title-row">
          <div className="badges-title">
            <Trophy size={24} />
            <h2>Achievements</h2>
          </div>
          <div className="badges-count">
            <span className="count-earned">{earnedCount}</span>
            <span className="count-divider">/</span>
            <span className="count-total">{totalCount}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="badges-progress">
          <div
            className="badges-progress-fill"
            style={{ width: `${(earnedCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Filter toggle for mobile */}
        <button
          className="badges-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          <span>{filters.find(f => f.id === activeFilter)?.label}</span>
          <ChevronDown
            size={16}
            className={`filter-chevron ${showFilters ? 'open' : ''}`}
          />
        </button>

        {/* Filters */}
        <div className={`badges-filters ${showFilters ? 'show' : ''}`}>
          {filters.map(filter => (
            <button
              key={filter.id}
              className={`filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter(filter.id);
                setShowFilters(false);
              }}
            >
              {filter.label}
              {filter.id === 'earned' && <span className="filter-count">{earnedCount}</span>}
              {filter.id === 'locked' && <span className="filter-count">{totalCount - earnedCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="badges-grid">
        {filteredBadges.map(badge => {
          const userBadge = userBadges.find(ub => ub.badgeId === badge.id);
          const isEarned = !!userBadge;
          const progress = !isEarned ? calculateProgress(badge) : null;

          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={isEarned}
              earnedAt={userBadge?.earnedAt}
              progress={progress}
            />
          );
        })}
      </div>

      {/* Empty state */}
      {filteredBadges.length === 0 && (
        <div className="badges-empty">
          <Trophy size={48} />
          <p>No badges found in this category</p>
        </div>
      )}
    </div>
  );
};

export default BadgesSection;
