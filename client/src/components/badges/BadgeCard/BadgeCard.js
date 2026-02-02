import React, { useState } from 'react';
import {
  Trees, Package, Recycle, Shield, Globe, Crown, Truck, Award, Trophy,
  Heart, Lightbulb, Users, Star, Sparkles, Zap, Gem, Rocket, Flame,
  Calendar, CheckCircle, Medal, Swords, Share2, Lock
} from 'lucide-react';
import { BADGE_RARITY } from '../../../config/badges';
import ShareModal from '../ShareModal/ShareModal';
import './BadgeCard.css';

// Icon mapping
const ICON_MAP = {
  Trees, Package, Recycle, Shield, Globe, Crown, Truck, Award, Trophy,
  Heart, Lightbulb, Users, Star, Sparkles, Zap, Gem, Rocket, Flame,
  Calendar, CheckCircle, Medal, Swords
};

const BadgeCard = ({ badge, earned = false, earnedAt = null, progress = null, onClick, onClaimBadge }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const IconComponent = ICON_MAP[badge.icon] || Star;
  const rarity = BADGE_RARITY[badge.rarity] || BADGE_RARITY.COMMON;

  const handleShare = (e) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleClaim = async (e) => {
    e.stopPropagation();
    if (claiming || !onClaimBadge) return;
    setClaiming(true);
    try {
      await onClaimBadge();
    } finally {
      setClaiming(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <div
        className={`badge-card ${earned ? 'badge-earned' : 'badge-locked'} badge-${badge.rarity.toLowerCase()}`}
        onClick={onClick}
        style={{
          '--rarity-color': rarity.color,
          '--rarity-glow': rarity.glow
        }}
      >
        {/* Rarity indicator */}
        <div className="badge-rarity-tag">{rarity.label}</div>

        {/* Badge icon container */}
        <div className="badge-icon-container">
          <div className="badge-icon-bg">
            {earned ? (
              <IconComponent className="badge-icon" size={32} />
            ) : (
              <Lock className="badge-icon badge-icon-locked" size={28} />
            )}
          </div>
          {earned && <div className="badge-icon-ring" />}
          {earned && <div className="badge-icon-glow" />}
        </div>

        {/* Badge info */}
        <div className="badge-info">
          <h4 className="badge-name">{badge.name}</h4>
          <p className="badge-description">{badge.description}</p>

          {/* Progress bar for locked badges */}
          {!earned && progress !== null && (
            <div className="badge-progress">
              <div className="badge-progress-bar">
                <div
                  className="badge-progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="badge-progress-text">{Math.round(progress)}%</span>
            </div>
          )}

          {/* Claim button for badges at 100% progress */}
          {!earned && onClaimBadge && progress >= 100 && (
            <button
              className="badge-claim-btn"
              onClick={handleClaim}
              disabled={claiming}
            >
              {claiming ? 'Claiming...' : 'Claim Badge'}
            </button>
          )}

          {/* Earned date */}
          {earned && earnedAt && (
            <p className="badge-earned-date">Earned {formatDate(earnedAt)}</p>
          )}
        </div>

        {/* Share button for earned badges */}
        {earned && (
          <button className="badge-share-btn" onClick={handleShare} aria-label="Share badge">
            <Share2 size={16} />
          </button>
        )}

        {/* Points indicator */}
        {badge.points > 0 && (
          <div className="badge-points">
            <Star size={12} />
            <span>+{badge.points}</span>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          badge={badge}
          earnedAt={earnedAt}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
};

export default BadgeCard;
