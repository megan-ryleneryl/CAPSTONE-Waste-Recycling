import React, { useState, useEffect } from 'react';
import styles from './PreferredModal.module.css';

const PreferredTimesModal = ({ onClose, onSubmit, currentTimes = [] }) => {
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [customTime, setCustomTime] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);

  // Predefined time slots
  const timeSlots = [
    { value: 'morning', label: 'Morning (6AM - 12PM)', startTime: '06:00', endTime: '12:00' },
    { value: 'afternoon', label: 'Afternoon (12PM - 6PM)', startTime: '12:00', endTime: '18:00' },
    { value: 'evening', label: 'Evening (6PM - 10PM)', startTime: '18:00', endTime: '22:00' },
    { value: 'flexible', label: 'Flexible', startTime: 'Flexible', endTime: '' }
  ];

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  useEffect(() => {
    setSelectedTimes([]);
    setSelectedDays([]);
    setCustomTime('');

    // Parse existing times if any
    if (currentTimes && currentTimes.length > 0) {
      const uniqueDays = new Set();
      const uniqueSlots = new Set();
      
      currentTimes.forEach(time => {
        if (typeof time === 'object' && time.day && time.slot) {
          uniqueDays.add(time.day);
          if (time.slot !== 'custom') {
            uniqueSlots.add(time.slot);
          } else if (time.startTime && time.endTime) {
            // Reconstruct custom time
            setCustomTime(`${time.startTime}-${time.endTime}`);
          }
        }
      });
      
      setSelectedDays(Array.from(uniqueDays));
      setSelectedTimes(Array.from(uniqueSlots));
      }
  }, [currentTimes]);

  const handleTimeToggle = (timeValue) => {
    setSelectedTimes(prev => {
      if (prev.includes(timeValue)) {
        return prev.filter(t => t !== timeValue);
      } else {
        return [...prev, timeValue];
      }
    });
  };

  const handleDayToggle = (day) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create structured time preferences with proper startTime and endTime
    const preferences = [];
    
    selectedDays.forEach(day => {
      selectedTimes.forEach(slotValue => {
        const timeSlot = timeSlots.find(t => t.value === slotValue);
        if (timeSlot) {
          preferences.push({
            day: day,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime || '',
            slot: slotValue
          });
        }
      });
      
      // Handle custom time if provided
      if (customTime) {
        const [start, end] = customTime.split('-').map(t => t.trim());
        if (start) {
          preferences.push({
            day: day,
            startTime: start,
            endTime: end || '',
            slot: 'custom'
          });
        }
      }
    });

    onSubmit(preferences);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <button onClick={onClose} className={styles.closeButton}>×</button>
            <h2>Set Preferred Pickup Times</h2>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Select Days</h3>
              <div className={styles.daysGrid}>
                {daysOfWeek.map(day => (
                  <label key={day} className={styles.dayOption}>
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                      className={styles.checkbox}
                    />
                    <span className={styles.dayLabel}>{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Select Time Slots</h3>
              <div className={styles.timeSlotsGrid}>
                {timeSlots.map(slot => (
                  <label key={slot.value} className={styles.timeSlot}>
                    <input
                      type="checkbox"
                      checked={selectedTimes.includes(slot.value)}
                      onChange={() => handleTimeToggle(slot.value)}
                      className={styles.checkbox}
                    />
                    <div className={styles.slotContent}>
                      <span className={styles.slotLabel}>{slot.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Or Add Custom Time</h3>
              <div className={styles.customTimeContainer}>
                <input
                  type="text"
                  placeholder="e.g., 2PM-4PM on weekdays"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className={styles.customInput}
                />
                <p className={styles.helpText}>
                  Specify any additional time preferences or special instructions
                </p>
              </div>
            </div>

            <div className={styles.summary}>
              <h4>Summary:</h4>
              {selectedDays.length > 0 && selectedTimes.length > 0 ? (
                <p>
                  Available on <strong>{selectedDays.join(', ')}</strong> during{' '}
                  <strong>
                    {selectedTimes.map(t => 
                      timeSlots.find(slot => slot.value === t)?.label || t
                    ).join(', ')}
                  </strong>
                </p>
              ) : (
                <p className={styles.noSelection}>No times selected yet</p>
              )}
              {customTime && (
                <p>Custom preference: <strong>{customTime}</strong></p>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={onClose} 
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
              >
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PreferredTimesModal;