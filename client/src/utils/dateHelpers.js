// client/src/utils/dateHelpers.js
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  // Handle different timestamp formats
  let date;
  
  if (timestamp?.seconds) {
    // Firestore Timestamp format
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    // Firestore Timestamp with toDate method
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    // String date
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    // Already a Date object
    date = timestamp;
  } else {
    // Try to parse it anyway
    date = new Date(timestamp);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return '';
  }
  
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Just now
  if (diffMinutes < 1) {
    return 'just now';
  }
  
  // Minutes ago
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  // Hours ago
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  // Days ago (up to 7 days)
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  
  // For older messages, show the actual date
  const today = new Date();
  const isThisYear = date.getFullYear() === today.getFullYear();
  
  if (isThisYear) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
};

export const formatDate = (date) => {
  if (!date) return 'Date not available';
  
  // Handle Firestore Timestamp objects
  let dateObj;
  
  if (date?.seconds) {
    // Firestore Timestamp format
    dateObj = new Date(date.seconds * 1000);
  } else if (date?.toDate && typeof date.toDate === 'function') {
    // Firestore Timestamp with toDate method
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    // String date
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    // Already a Date object
    dateObj = date;
  } else {
    // Try to parse it anyway
    dateObj = new Date(date);
  }
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Date not available';
  }
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatFullDateTime = (timestamp) => {
  if (!timestamp) return '';
  
  let date;
  
  if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  
  if (isNaN(date.getTime())) {
    return '';
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};