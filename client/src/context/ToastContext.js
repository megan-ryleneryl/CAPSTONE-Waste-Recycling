import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Check, X, AlertTriangle, Info, Package, Star } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Toast types with their default configurations
const TOAST_TYPES = {
  success: { icon: <Check size={16} />, duration: 4000 },
  error: { icon: <X size={16} />, duration: 5000 },
  warning: { icon: <AlertTriangle size={16} />, duration: 4500 },
  info: { icon: <Info size={16} />, duration: 4000 },
  pickup: { icon: <Package size={16} />, duration: 5000 },
  points: { icon: <Star size={16} />, duration: 0 }, // Points have special handling
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [pointsPopup, setPointsPopup] = useState(null);
  const [unlockedBadge, setUnlockedBadge] = useState(null);
  const [pickupPopup, setPickupPopup] = useState(null);
  const audioContextRef = useRef(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };

    // Initialize on first click/touch
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Play notification sound using Web Audio API
  const playSound = useCallback((type = 'notification') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Resume audio context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (type === 'badge') {
        // Triumphant fanfare for badge unlock
        const notes = [
          { freq: 523.25, start: 0, duration: 0.15 },     // C5
          { freq: 659.25, start: 0.12, duration: 0.15 },  // E5
          { freq: 783.99, start: 0.24, duration: 0.15 },  // G5
          { freq: 1046.50, start: 0.36, duration: 0.3 },  // C6 (held longer)
          { freq: 1174.66, start: 0.5, duration: 0.4 },   // D6 (final note)
        ];

        notes.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.value = note.freq;

          gain.gain.setValueAtTime(0, now + note.start);
          gain.gain.linearRampToValueAtTime(0.18, now + note.start + 0.02);
          gain.gain.setValueAtTime(0.18, now + note.start + note.duration * 0.7);
          gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + note.start);
          osc.stop(now + note.start + note.duration + 0.05);
        });
      } else if (type === 'points') {
        // Exciting coin/points sound - ascending arpeggio
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        frequencies.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.25);
        });
      } else if (type === 'success' || type === 'pickup') {
        // Pleasant success chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.setValueAtTime(0.12, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Standard notification blip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 440; // A4

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Audio play failed, ignore silently
      console.log('Audio playback not available');
    }
  }, []);

  // Add a toast notification
  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = uuidv4();
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;

    const toast = {
      id,
      message,
      type,
      icon: options.icon || config.icon,
      title: options.title || null,
      duration: options.duration || config.duration,
      action: options.action || null,
      actionLabel: options.actionLabel || null,
      timestamp: new Date(),
    };

    setToasts(prev => [...prev, toast]);

    // Play sound for certain types
    if (['success', 'pickup', 'points'].includes(type) && options.playSound !== false) {
      playSound(type);
    }

    // Auto-remove after duration (if not 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, [playSound]);

  // Remove a toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Show points earned popup (special animated popup)
  const showPointsEarned = useCallback((points, reason, options = {}) => {
    const popup = {
      id: uuidv4(),
      points,
      reason,
      bonus: options.bonus || null,
      streak: options.streak || null,
      achievement: options.achievement || null,
      timestamp: new Date(),
    };

    setPointsPopup(popup);
    playSound('points');

    // Auto-hide after animation completes
    setTimeout(() => {
      setPointsPopup(null);
    }, options.duration || 3500);
  }, [playSound]);

  // Hide points popup manually
  const hidePointsPopup = useCallback(() => {
    setPointsPopup(null);
  }, []);

  // Show badge unlocked popup
  const showBadgeUnlocked = useCallback((badge) => {
    setUnlockedBadge(badge);
    playSound('badge');
  }, [playSound]);

  // Hide badge popup manually
  const hideBadgePopup = useCallback(() => {
    setUnlockedBadge(null);
  }, []);

  // Show pickup status popup (animated popup for pickup events)
  const showPickupPopup = useCallback((status, details = {}) => {
    const popup = {
      id: uuidv4(),
      status,
      pickupID: details.pickupID || null,
      actorName: details.actorName || null,
      location: details.location || null,
      timestamp: new Date(),
    };

    setPickupPopup(popup);
    playSound('pickup');

    // Auto-hide after animation completes
    setTimeout(() => {
      setPickupPopup(null);
    }, details.duration || 4000);
  }, [playSound]);

  // Hide pickup popup manually
  const hidePickupPopup = useCallback(() => {
    setPickupPopup(null);
  }, []);

  // Convenience methods for common toast types
  const success = useCallback((message, options = {}) =>
    addToast(message, 'success', options), [addToast]);

  const error = useCallback((message, options = {}) =>
    addToast(message, 'error', options), [addToast]);

  const warning = useCallback((message, options = {}) =>
    addToast(message, 'warning', options), [addToast]);

  const info = useCallback((message, options = {}) =>
    addToast(message, 'info', options), [addToast]);

  // Pickup workflow specific toasts
  const pickupNotification = useCallback((message, options = {}) =>
    addToast(message, 'pickup', {
      title: options.title || 'Pickup Update',
      playSound: true,
      ...options
    }), [addToast]);

  const value = {
    toasts,
    pointsPopup,
    unlockedBadge,
    pickupPopup,
    addToast,
    removeToast,
    showPointsEarned,
    hidePointsPopup,
    showBadgeUnlocked,
    hideBadgePopup,
    showPickupPopup,
    hidePickupPopup,
    success,
    error,
    warning,
    info,
    pickupNotification,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};
