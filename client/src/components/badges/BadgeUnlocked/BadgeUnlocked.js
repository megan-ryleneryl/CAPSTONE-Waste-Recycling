import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Trees, Package, Recycle, Shield, Globe, Crown, Truck, Award, Trophy,
  Heart, Lightbulb, Users, Star, Sparkles, Zap, Gem, Rocket, Flame,
  Calendar, CheckCircle, Medal, Swords, Share2, X
} from 'lucide-react';
import { BADGE_RARITY } from '../../../config/badges';
import ShareModal from '../ShareModal/ShareModal';
import './BadgeUnlocked.css';

// Icon mapping
const ICON_MAP = {
  Trees, Package, Recycle, Shield, Globe, Crown, Truck, Award, Trophy,
  Heart, Lightbulb, Users, Star, Sparkles, Zap, Gem, Rocket, Flame,
  Calendar, CheckCircle, Medal, Swords
};

const BadgeUnlocked = ({ badge, onClose }) => {
  const [phase, setPhase] = useState('enter');
  const [showShareModal, setShowShareModal] = useState(false);

  const IconComponent = ICON_MAP[badge.icon] || Star;
  const rarity = BADGE_RARITY[badge.rarity] || BADGE_RARITY.COMMON;

  // Generate confetti particles
  const confetti = useMemo(() => {
    const particles = [];
    const colors = [rarity.color, '#fbbf24', '#10b981', '#3b82f6', '#f43f5e'];

    for (let i = 0; i < 25; i++) {
      particles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 1.5,
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 360,
        type: Math.random() > 0.6 ? 'star' : Math.random() > 0.5 ? 'circle' : 'rect',
      });
    }
    return particles;
  }, [rarity.color]);

  // Floating particles around badge
  const orbitParticles = useMemo(() => {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        id: i,
        delay: i * 0.15,
        color: rarity.color,
      });
    }
    return particles;
  }, [rarity.color]);

  useEffect(() => {
    // Phase transitions
    const timer1 = setTimeout(() => setPhase('show'), 100);
    const timer2 = setTimeout(() => setPhase('idle'), 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleClose = () => {
    setPhase('exit');
    setTimeout(onClose, 400);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  return ReactDOM.createPortal(
    <>
      <div className={`badge-unlocked-overlay phase-${phase}`}>
        {/* Confetti burst */}
        {phase !== 'exit' && (
          <div className="badge-confetti">
            {confetti.map(particle => (
              <div
                key={particle.id}
                className={`confetti-particle confetti-${particle.type}`}
                style={{
                  '--left': `${particle.left}%`,
                  '--delay': `${particle.delay}s`,
                  '--duration': `${particle.duration}s`,
                  '--size': `${particle.size}px`,
                  '--rotation': `${particle.rotation}deg`,
                  '--color': particle.color,
                }}
              />
            ))}
          </div>
        )}

        {/* Main card */}
        <div
          className="badge-unlocked-card"
          style={{
            '--rarity-color': rarity.color,
            '--rarity-glow': rarity.glow,
          }}
        >
          {/* Close button */}
          <button className="badge-unlocked-close" onClick={handleClose}>
            <X size={20} />
          </button>

          {/* Radial burst background */}
          <div className="badge-radial-burst">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="radial-ray"
                style={{ '--rotation': `${i * 45}deg` }}
              />
            ))}
          </div>

          {/* Orbit particles */}
          <div className="badge-orbit">
            {orbitParticles.map(particle => (
              <div
                key={particle.id}
                className="orbit-particle"
                style={{
                  '--delay': `${particle.delay}s`,
                  '--color': particle.color,
                }}
              >
                <Star size={10} />
              </div>
            ))}
          </div>

          {/* Header text */}
          <div className="badge-unlocked-header">
            <span className="unlocked-label">ACHIEVEMENT UNLOCKED</span>
            <span className="unlocked-rarity">{rarity.label}</span>
          </div>

          {/* Badge icon */}
          <div className="badge-unlocked-icon-container">
            <div className="badge-unlocked-icon-glow" />
            <div className="badge-unlocked-icon-ring ring-1" />
            <div className="badge-unlocked-icon-ring ring-2" />
            <div className="badge-unlocked-icon">
              <IconComponent size={48} />
            </div>
          </div>

          {/* Badge name and description */}
          <div className="badge-unlocked-info">
            <h2 className="badge-unlocked-name">{badge.name}</h2>
            <p className="badge-unlocked-description">{badge.description}</p>
          </div>

          {/* Points earned */}
          {badge.points > 0 && (
            <div className="badge-unlocked-points">
              <Star size={16} />
              <span>+{badge.points} Points</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="badge-unlocked-actions">
            <button className="badge-action-share" onClick={handleShare}>
              <Share2 size={18} />
              <span>Share Achievement</span>
            </button>
            <button className="badge-action-close" onClick={handleClose}>
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          badge={badge}
          earnedAt={new Date()}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>,
    document.body
  );
};

export default BadgeUnlocked;
