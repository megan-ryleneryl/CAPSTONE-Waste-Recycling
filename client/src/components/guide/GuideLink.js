import React, { useState } from 'react';
import { Info } from 'lucide-react';
import QuickGuide from './QuickGuide';
import styles from './GuideLink.module.css';

const GuideLink = ({ text, targetPage, icon, className = '' }) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <button
        className={`${styles.guideLink} ${className}`}
        onClick={() => setShowGuide(true)}
        type="button"
      >
        {icon ? (
          <span className={styles.icon}>{icon}</span>
        ) : (
          <Info size={16} className={styles.icon} />
        )}
        <span className={styles.text}>{text}</span>
      </button>
      <QuickGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        initialPage={targetPage}
      />
    </>
  );
};

export default GuideLink;
