import { useState, useEffect, useRef, useCallback } from 'react';
import { getDistance, isWithinRadius } from '../utils/geoUtils';

/**
 * Custom hook for tracking collector location during pickup
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether tracking is enabled
 * @param {Object} options.targetLocation - Target location {lat, lng}
 * @param {number} options.arrivalRadius - Radius in meters to consider "arrived" (default: 50)
 * @param {number} options.updateInterval - Update interval in milliseconds (default: 8000)
 * @param {Function} options.onArrival - Callback when arrived at destination
 * @param {Function} options.onLocationUpdate - Callback on each location update
 * @returns {Object} Tracking state and controls
 */
const useLocationTracking = ({
  enabled = false,
  targetLocation = null,
  arrivalRadius = 50,
  updateInterval = 8000,
  onArrival = null,
  onLocationUpdate = null,
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'granted', 'denied', 'prompt'

  const watchIdRef = useRef(null);
  const intervalIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const hasTriggeredArrivalRef = useRef(false);
  const isTrackingRef = useRef(false); // Track if we're currently tracking to prevent duplicates

  // Use refs to store callbacks to avoid recreating functions
  const onArrivalRef = useRef(onArrival);
  const onLocationUpdateRef = useRef(onLocationUpdate);

  // Update refs when callbacks change
  useEffect(() => {
    onArrivalRef.current = onArrival;
    onLocationUpdateRef.current = onLocationUpdate;
  }, [onArrival, onLocationUpdate]);

  /**
   * Request location permission and get current position
   */
  const requestLocationPermission = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPermissionStatus('granted');
          resolve(position);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              setPermissionStatus('denied');
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your location settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'An unknown error occurred while getting location.';
          }
          setError(errorMessage);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  /**
   * Update location and check arrival
   */
  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Warn about very low accuracy but still use it for distance calculation
        if (accuracy > 1000) {
          console.warn('Location accuracy very low:', accuracy, 'meters');
          setError(`Low location accuracy (±${Math.round(accuracy)}m). Distance may be inaccurate.`);
        } else if (accuracy > 500) {
          console.warn('Location accuracy low:', accuracy, 'meters');
        } else {
          // Good accuracy, clear any previous error
          setError(null);
        }

        const newLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: new Date(position.timestamp),
        };

        setCurrentLocation(newLocation);
        lastPositionRef.current = newLocation;

        // Calculate distance to target
        if (targetLocation && targetLocation.lat && targetLocation.lng) {
          const distanceToTarget = getDistance(
            { lat: latitude, lng: longitude },
            targetLocation
          );
          setDistance(distanceToTarget);

          // Check if arrived
          const arrivedAtDestination = isWithinRadius(
            { lat: latitude, lng: longitude },
            targetLocation,
            arrivalRadius
          );

          // Debug arrival check
          console.log('Arrival check:', {
            distanceToTarget,
            arrivalRadius,
            arrivedAtDestination,
            hasTriggeredArrival: hasTriggeredArrivalRef.current,
            accuracy
          });

          // Only trigger arrival if accuracy is reasonable (< 500m for network-based location)
          if (arrivedAtDestination && !hasTriggeredArrivalRef.current && accuracy < 500) {
            console.log('🎉 Arrival triggered! Updating status...');
            setHasArrived(true);
            hasTriggeredArrivalRef.current = true;
            if (onArrivalRef.current) {
              onArrivalRef.current({
                location: newLocation,
                distance: distanceToTarget,
              });
            }
          }

          // Callback for location update (still update even with low accuracy)
          if (onLocationUpdateRef.current && accuracy < 2000) {
            onLocationUpdateRef.current({
              location: newLocation,
              distance: distanceToTarget,
              arrived: arrivedAtDestination,
            });
          }
        }
      },
      (error) => {
        console.error('Location update error:', error);
        let errorMessage = 'Unable to update location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            setPermissionStatus('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Make sure location services are enabled.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'Location error';
        }
        setError(errorMessage);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [targetLocation, arrivalRadius]); // Removed onArrival and onLocationUpdate - using refs instead

  /**
   * Start location tracking
   */
  const startTracking = useCallback(async () => {
    // Prevent starting if already tracking
    if (isTrackingRef.current) {
      console.log('Already tracking, skipping start');
      return;
    }

    try {
      console.log('Starting location tracking...');
      isTrackingRef.current = true;

      // Request permission and get initial position
      try {
        await requestLocationPermission();
        console.log('Location permission granted');
      } catch (permError) {
        // First attempt failed, retry one more time
        console.warn('First attempt failed, retrying...');
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported');
        }

        // Retry one more time
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setPermissionStatus('granted');
              console.log('Location permission granted on retry');
              resolve(position);
            },
            (error) => {
              reject(new Error('Unable to access location. Please check browser settings.'));
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 60000,
            }
          );
        });
      }

      setIsTracking(true);
      setError(null);
      hasTriggeredArrivalRef.current = false;

      // Get initial location
      updateLocation();

      // Set up periodic location updates
      intervalIdRef.current = setInterval(() => {
        updateLocation();
      }, updateInterval);

      console.log('Location tracking started successfully');
    } catch (err) {
      console.error('Failed to start tracking:', err);
      setError(err.message || 'Failed to start location tracking');
      setIsTracking(false);
      isTrackingRef.current = false;
    }
  }, [requestLocationPermission, updateLocation, updateInterval]);

  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    console.log('Stopping location tracking...');
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    isTrackingRef.current = false;
  }, []);

  /**
   * Reset tracking state
   */
  const resetTracking = useCallback(() => {
    stopTracking();
    setCurrentLocation(null);
    setDistance(null);
    setError(null);
    setHasArrived(false);
    hasTriggeredArrivalRef.current = false;
    lastPositionRef.current = null;
    isTrackingRef.current = false;
  }, [stopTracking]);

  /**
   * Effect to handle enabled state changes
   */
  useEffect(() => {
    let mounted = true;

    if (enabled && !isTracking && !hasArrived) {
      console.log('Enabling location tracking...');
      startTracking();
    } else if (!enabled && isTracking) {
      console.log('Disabling location tracking...');
      stopTracking();
    }

    return () => {
      mounted = false;
      // Cleanup on unmount
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // Only re-run when enabled changes, not when callbacks change

  return {
    currentLocation,
    distance,
    isTracking,
    error,
    hasArrived,
    permissionStatus,
    startTracking,
    stopTracking,
    resetTracking,
  };
};

export default useLocationTracking;
