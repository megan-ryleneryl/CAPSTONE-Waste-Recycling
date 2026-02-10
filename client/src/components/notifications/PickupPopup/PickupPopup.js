import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Package, MapPin, CheckCircle, Clock, Navigation, PartyPopper } from 'lucide-react';
import './PickupPopup.css';

const PickupPopup = ({ popup, onClose }) => {
  const navigate = useNavigate();
  const [animationPhase, setAnimationPhase] = useState('enter');
  const [showConfetti, setShowConfetti] = useState(false);

  // Status configurations
  const statusConfig = {
    Proposed: {
      title: 'New Pickup Request!',
      subtitle: 'Someone wants to collect your waste',
      icon: Package,
      color: '#f59e0b',
      showConfetti: false,
    },
    Confirmed: {
      title: 'Pickup Confirmed!',
      subtitle: 'Your pickup has been accepted',
      icon: CheckCircle,
      color: '#10b981',
      showConfetti: true,
    },
    'In-Transit': {
      title: 'Collector On The Way!',
      subtitle: 'They are heading to your location',
      icon: Navigation,
      color: '#3b82f6',
      showConfetti: false,
    },
    ArrivedAtPickup: {
      title: 'Collector Has Arrived!',
      subtitle: 'Go meet them at the pickup location',
      icon: MapPin,
      color: '#8b5cf6',
      showConfetti: false,
    },
    Completed: {
      title: 'Pickup Complete!',
      subtitle: 'Thank you for recycling',
      icon: PartyPopper,
      color: '#059669',
      showConfetti: true,
    },
    Cancelled: {
      title: 'Pickup Cancelled',
      subtitle: 'The pickup has been cancelled',
      icon: Clock,
      color: '#ef4444',
      showConfetti: false,
    },
  };

  const config = statusConfig[popup.status] || statusConfig.Proposed;
  const IconComponent = config.icon;

  // Generate confetti particles for completed/confirmed status
  const confettiParticles = useMemo(() => {
    if (!config.showConfetti) return [];
    const particles = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#3B6535'];

    for (let i = 0; i < 40; i++) {
      particles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 1,
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        type: Math.random() > 0.5 ? 'circle' : 'rect',
      });
    }
    return particles;
  }, [config.showConfetti]);

  // Generate floating truck icons for in-transit
  const floatingIcons = useMemo(() => {
    if (popup.status !== 'In-Transit') return [];
    const icons = [];
    for (let i = 0; i < 5; i++) {
      icons.push({
        id: i,
        left: 15 + Math.random() * 70,
        delay: i * 0.15,
        duration: 1.5 + Math.random() * 0.5,
      });
    }
    return icons;
  }, [popup.status]);

  useEffect(() => {
    setShowConfetti(config.showConfetti);

    // Phase transitions
    const timer1 = setTimeout(() => setAnimationPhase('show'), 100);
    const timer2 = setTimeout(() => setShowConfetti(false), 2500);
    const timer3 = setTimeout(() => setAnimationPhase('exit'), 3500);
    const timer4 = setTimeout(onClose, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onClose, config.showConfetti]);

  const handleClick = () => {
    if (popup.pickupID) {
      navigate(`/tracking/${popup.pickupID}`);
      onClose();
    }
  };

  return (
    <div
      className={`pickup-popup-overlay ${animationPhase}`}
      onClick={handleClick}
      style={{ cursor: popup.pickupID ? 'pointer' : 'default' }}
    >
      {/* Confetti Layer */}
      {showConfetti && (
        <div className="pickup-confetti-container">
          {confettiParticles.map(particle => (
            <div
              key={particle.id}
              className={`pickup-confetti-particle pickup-confetti-${particle.type}`}
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

      {/* Floating Icons for In-Transit */}
      {floatingIcons.length > 0 && (
        <div className="pickup-floating-icons">
          {floatingIcons.map(icon => (
            <div
              key={icon.id}
              className="pickup-floating-truck"
              style={{
                '--left': `${icon.left}%`,
                '--delay': `${icon.delay}s`,
                '--duration': `${icon.duration}s`,
              }}
            >
              <Truck size={20} />
            </div>
          ))}
        </div>
      )}

      {/* Main Popup Card */}
      <div className="pickup-popup-card" style={{ '--status-color': config.color }}>
        {/* Glow effect */}
        <div className="pickup-glow" style={{ background: `radial-gradient(circle, ${config.color}40 0%, transparent 70%)` }} />

        {/* Radial burst background */}
        <div className="pickup-burst">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="pickup-ray"
              style={{
                '--rotation': `${i * 45}deg`,
                background: `linear-gradient(to top, transparent, ${config.color}30, transparent)`
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="pickup-popup-content">
          {/* Icon badge */}
          <div className="pickup-badge-container">
            <div className="pickup-badge" style={{ background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}cc 100%)` }}>
              <div className="pickup-badge-inner">
                <IconComponent className="pickup-icon" size={32} />
              </div>
            </div>
            <div className="pickup-ring" style={{ borderColor: `${config.color}80` }} />
            <div className="pickup-ring pickup-ring-2" style={{ borderColor: `${config.color}60` }} />
          </div>

          {/* Title */}
          <h2 className="pickup-title">{config.title}</h2>

          {/* Subtitle */}
          <p className="pickup-subtitle">{config.subtitle}</p>

          {/* Actor name if provided */}
          {popup.actorName && (
            <div className="pickup-actor">
              <Truck size={16} />
              <span>{popup.actorName}</span>
            </div>
          )}

          {/* Location if provided */}
          {popup.location && (
            <div className="pickup-location">
              <MapPin size={14} />
              <span>{popup.location}</span>
            </div>
          )}

          {/* Click hint */}
          {popup.pickupID && (
            <div className="pickup-hint">
              Click to view details
            </div>
          )}
        </div>

        {/* Shimmer effect */}
        <div className="pickup-shimmer" />
      </div>
    </div>
  );
};

export default PickupPopup;
