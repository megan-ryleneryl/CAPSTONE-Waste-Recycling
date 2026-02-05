import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Facebook, Twitter, Linkedin, Link2, Check, Download,
  Trees, Package, Recycle, Shield, Globe, Crown, Truck, Award, Trophy,
  Heart, Lightbulb, Users, Star, Sparkles, Zap, Gem, Rocket, Flame,
  Calendar, CheckCircle, Medal, Swords
} from 'lucide-react';
import { BADGE_RARITY } from '../../../config/badges';
import './ShareModal.css';

// Icon mapping
const ICON_MAP = {
  Trees, Package, Recycle, Shield, Globe, Crown, Truck, Award, Trophy,
  Heart, Lightbulb, Users, Star, Sparkles, Zap, Gem, Rocket, Flame,
  Calendar, CheckCircle, Medal, Swords
};

const ShareModal = ({ badge, earnedAt, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const shareCardRef = useRef(null);

  const IconComponent = ICON_MAP[badge.icon] || Star;
  const rarity = BADGE_RARITY[badge.rarity] || BADGE_RARITY.COMMON;

  const shareUrl = window.location.origin;
  const shareText = badge.shareText || `I just earned the "${badge.name}" badge on EcoCollect!`;

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Social share URLs
  const socialLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=EcoCollect,Recycling,Sustainability`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`,
  };

  const handleSocialShare = (platform) => {
    const url = socialLinks[platform];
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadImage = async () => {
    if (!shareCardRef.current) return;

    setDownloading(true);
    try {
      // Dynamically import html2canvas
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `${badge.name.replace(/\s+/g, '-').toLowerCase()}-badge.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download:', err);
      // Fallback: alert user to take a screenshot
      alert('Image download not available. Please take a screenshot instead.');
    } finally {
      setDownloading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <h2 className="share-modal-title">Share Your Achievement</h2>

        {/* Shareable Badge Card */}
        <div className="share-card-wrapper">
          <div
            ref={shareCardRef}
            className="share-card"
            style={{
              '--rarity-color': rarity.color,
              '--rarity-glow': rarity.glow
            }}
          >
            {/* Background pattern */}
            <div className="share-card-bg">
              <div className="share-card-pattern" />
            </div>

            {/* Header */}
            <div className="share-card-header">
              <span className="share-card-app">EcoCollect</span>
              <span className="share-card-rarity">{rarity.label}</span>
            </div>

            {/* Badge icon */}
            <div className="share-card-badge">
              <div className="share-card-icon-outer">
                <div className="share-card-icon-inner">
                  <IconComponent size={48} />
                </div>
              </div>
              <div className="share-card-stars">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={`share-card-star star-${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Badge info */}
            <div className="share-card-info">
              <h3 className="share-card-name">{badge.name}</h3>
              <p className="share-card-description">{badge.description}</p>
              {earnedAt && (
                <p className="share-card-date">Earned {formatDate(earnedAt)}</p>
              )}
            </div>

            {/* Footer */}
            <div className="share-card-footer">
              <span className="share-card-tag">#RecyclingHero</span>
              <span className="share-card-tag">#EcoCollect</span>
            </div>
          </div>
        </div>

        {/* Share options */}
        <div className="share-options">
          <p className="share-options-label">Share on social media</p>

          <div className="share-buttons">
            <button
              className="share-btn share-btn-facebook"
              onClick={() => handleSocialShare('facebook')}
              aria-label="Share on Facebook"
            >
              <Facebook size={20} />
              <span>Facebook</span>
            </button>

            <button
              className="share-btn share-btn-twitter"
              onClick={() => handleSocialShare('twitter')}
              aria-label="Share on Twitter"
            >
              <Twitter size={20} />
              <span>Twitter</span>
            </button>

            <button
              className="share-btn share-btn-linkedin"
              onClick={() => handleSocialShare('linkedin')}
              aria-label="Share on LinkedIn"
            >
              <Linkedin size={20} />
              <span>LinkedIn</span>
            </button>
          </div>

          <div className="share-divider">
            <span>or</span>
          </div>

          <div className="share-actions">
            <button
              className="share-action-btn"
              onClick={handleCopyLink}
            >
              {copied ? <Check size={18} /> : <Link2 size={18} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              className="share-action-btn"
              onClick={handleDownloadImage}
              disabled={downloading}
            >
              <Download size={18} />
              <span>{downloading ? 'Saving...' : 'Save Image'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShareModal;
