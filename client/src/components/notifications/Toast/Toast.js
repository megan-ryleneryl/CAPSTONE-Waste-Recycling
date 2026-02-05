import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './Toast.css';

const Toast = ({ toast, index, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  // Handle exit animation
  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  // Progress bar animation
  useEffect(() => {
    if (toast.duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (toast.duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [toast.duration]);

  // Handle action click
  const handleAction = () => {
    if (toast.action) {
      toast.action();
    }
    handleClose();
  };

  return (
    <div
      className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      style={{ '--index': index }}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-icon-wrapper">
        <span className="toast-icon">{toast.icon}</span>
      </div>

      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
        {toast.actionLabel && (
          <button className="toast-action" onClick={handleAction}>
            {toast.actionLabel}
          </button>
        )}
      </div>

      <button className="toast-close" onClick={handleClose} aria-label="Close notification">
        <X size={16} />
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="toast-progress-wrapper">
          <div
            className="toast-progress"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default Toast;
