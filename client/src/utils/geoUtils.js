/**
 * Geolocation utility functions for distance calculation and location tracking
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
};

/**
 * Check if a position is within a certain radius of a target location
 * @param {Object} currentPos - Current position {lat, lng}
 * @param {Object} targetPos - Target position {lat, lng}
 * @param {number} radius - Radius in meters
 * @returns {boolean} True if within radius
 */
export const isWithinRadius = (currentPos, targetPos, radius) => {
  if (!currentPos || !targetPos || !currentPos.lat || !currentPos.lng || !targetPos.lat || !targetPos.lng) {
    return false;
  }

  const distance = calculateDistance(
    currentPos.lat,
    currentPos.lng,
    targetPos.lat,
    targetPos.lng
  );

  return distance <= radius;
};

/**
 * Get distance between two positions
 * @param {Object} pos1 - Position 1 {lat, lng}
 * @param {Object} pos2 - Position 2 {lat, lng}
 * @returns {number|null} Distance in meters, or null if invalid positions
 */
export const getDistance = (pos1, pos2) => {
  if (!pos1 || !pos2 || !pos1.lat || !pos1.lng || !pos2.lat || !pos2.lng) {
    return null;
  }

  return calculateDistance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
};

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if valid coordinates
 */
export const isValidCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};
