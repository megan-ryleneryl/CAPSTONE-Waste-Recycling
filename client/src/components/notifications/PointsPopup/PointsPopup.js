import React, { useState, useEffect, useMemo } from 'react';
import { Star, Zap, Trophy, TrendingUp, Sparkles, Flame } from 'lucide-react';
import './PointsPopup.css';

const PointsPopup = ({ popup, onClose }) => {
  const [animationPhase, setAnimationPhase] = useState('enter');
  const [showConfetti, setShowConfetti] = useState(true);

  // Generate confetti particles
  const confettiParticles = useMemo(() => {
    const particles = [];
    const colors = ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];

    for (let i = 0; i < 20; i++) {
      particles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1.5,
        size: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
        type: Math.random() > 0.5 ? 'circle' : 'rect',
      });
    }
    return particles;
  }, []);

  // Generate floating coins
  const floatingCoins = useMemo(() => {
    const coins = [];
    for (let i = 0; i < 4; i++) {
      coins.push({
        id: i,
        left: 20 + Math.random() * 60,
        delay: i * 0.1,
        duration: 1.5 + Math.random() * 0.5,
      });
    }
    return coins;
  }, []);

  useEffect(() => {
    // Phase transitions
    const timer1 = setTimeout(() => setAnimationPhase('show'), 100);
    const timer2 = setTimeout(() => setShowConfetti(false), 2000);
    const timer3 = setTimeout(() => setAnimationPhase('exit'), 3000);
    const timer4 = setTimeout(onClose, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onClose]);

  // Get icon based on reason
  const getReasonIcon = () => {
    const reason = popup.reason?.toLowerCase() || '';
    if (reason.includes('post') || reason.includes('created')) return <Star size={20} />;
    if (reason.includes('pickup') || reason.includes('completed')) return <Trophy size={20} />;
    if (reason.includes('streak')) return <Zap size={20} />;
    if (reason.includes('profile')) return <TrendingUp size={20} />;
    return <Sparkles size={20} />;
  };

  return (
    <div className={`points-popup-overlay ${animationPhase}`}>
      {/* Confetti Layer */}
      {showConfetti && (
        <div className="confetti-container">
          {confettiParticles.map(particle => (
            <div
              key={particle.id}
              className={`confetti-particle confetti-${particle.type}`}
              style={{
                '--left': `${particle.left}%`,
                '--delay': `${particle.delay}s`,
                '--duration': `${particle.duration}s`,
                '--size': `${particle.size}px`,
                '--rotation': `${particle.rotation}deg`,
                backgroundColor: particle.color,
              }}
            />
          ))}
        </div>
      )}

      {/* Floating Coins */}
      <div className="floating-coins-container">
        {floatingCoins.map(coin => (
          <div
            key={coin.id}
            className="floating-coin"
            style={{
              '--left': `${coin.left}%`,
              '--delay': `${coin.delay}s`,
              '--duration': `${coin.duration}s`,
            }}
          >
            <Star className="coin-icon" size={24} />
          </div>
        ))}
      </div>

      {/* Main Popup Card */}
      <div className="points-popup-card">
        {/* Glow effect */}
        <div className="points-glow" />

        {/* Star burst background */}
        <div className="star-burst">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="star-ray"
              style={{ '--rotation': `${i * 30}deg` }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="points-popup-content">
          {/* Points badge */}
          <div className="points-badge-container">
            <div className="points-badge">
              <div className="points-badge-inner">
                <Star className="points-star-icon" size={28} />
              </div>
            </div>
            <div className="points-ring" />
            <div className="points-ring points-ring-2" />
          </div>

          {/* Points amount */}
          <div className="points-amount-container">
            <span className="points-plus">+</span>
            <span className="points-number">{popup.points}</span>
            <span className="points-label">POINTS</span>
          </div>

          {/* Reason */}
          <div className="points-reason">
            <span className="reason-icon">{getReasonIcon()}</span>
            <span className="reason-text">{popup.reason}</span>
          </div>

          {/* Bonus indicator */}
          {popup.bonus && (
            <div className="points-bonus">
              <Zap size={14} />
              <span>+{popup.bonus} Bonus!</span>
            </div>
          )}

          {/* Streak indicator */}
          {popup.streak && (
            <div className="points-streak">
              <Flame size={16} className="streak-fire" />
              <span>{popup.streak} day streak!</span>
            </div>
          )}

          {/* Achievement unlocked */}
          {popup.achievement && (
            <div className="points-achievement">
              <Trophy size={16} />
              <span>Achievement Unlocked: {popup.achievement}</span>
            </div>
          )}
        </div>

        {/* Shimmer effect */}
        <div className="points-shimmer" />
      </div>
    </div>
  );
};

export default PointsPopup;
