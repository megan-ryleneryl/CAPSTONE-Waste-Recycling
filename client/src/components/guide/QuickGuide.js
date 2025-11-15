import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import ModalPortal from '../modal/ModalPortal';
import { getGuidePages } from './guideContent';
import styles from './QuickGuide.module.css';

const QuickGuide = ({ isOpen, onClose, initialPage = 1 }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Get guide pages with onClose callback
  const guidePages = useMemo(() => getGuidePages(onClose), [onClose]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(initialPage);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialPage]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenQuickGuide', 'true');
    }
    onClose();
  };

  const handleNext = () => {
    if (currentPage < guidePages.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleDotClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (!isOpen) return null;

  const currentPageData = guidePages[currentPage - 1];
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === guidePages.length;

  return (
    <ModalPortal>
      <div className={styles.overlay} onClick={handleClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>Welcome to EcoTayo!</h2>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close guide"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            <div className={styles.pageContent} key={currentPage}>
              <h3 className={styles.pageTitle}>{currentPageData.title}</h3>
              <div className={styles.pageBody}>
                {currentPageData.content}
              </div>

              {/* Shortcut Button */}
              {currentPageData.shortcutButton && (
                <div className={styles.shortcutContainer}>
                  {currentPageData.shortcutButton}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {/* Don't Show Again Checkbox (only on last page) */}
            {isLastPage && (
              <div className={styles.checkboxContainer}>
                <input
                  type="checkbox"
                  id="dontShowAgain"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className={styles.checkbox}
                />
                <label htmlFor="dontShowAgain" className={styles.checkboxLabel}>
                  Don't show this guide again
                </label>
              </div>
            )}

            {/* Page Indicators */}
            <div className={styles.indicators}>
              {guidePages.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.dot} ${currentPage === index + 1 ? styles.activeDot : ''}`}
                  onClick={() => handleDotClick(index + 1)}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className={styles.navigation}>
              <button
                className={styles.navButton}
                onClick={handlePrevious}
                disabled={isFirstPage}
                style={{ visibility: isFirstPage ? 'hidden' : 'visible' }}
              >
                <ChevronLeft size={20} />
                Previous
              </button>

              {isLastPage ? (
                <button
                  className={`${styles.navButton} ${styles.primaryButton}`}
                  onClick={handleClose}
                >
                  Get Started
                </button>
              ) : (
                <button
                  className={`${styles.navButton} ${styles.primaryButton}`}
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default QuickGuide;
